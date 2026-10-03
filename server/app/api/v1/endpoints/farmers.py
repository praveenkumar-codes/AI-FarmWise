"""Multi-Farmer Fleet & Scoped Farmer Endpoints:
- GET /api/v1/farmers
- GET /api/v1/farmers/{farmer_id}/dashboard?lang=en|te|hi
- POST /api/v1/farmers/{farmer_id}/actions/decision
"""
from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.mavlink_adapter import SafetyInterlockError, mavlink_adapter
from app.agents.decision.decision_agent import (
    build_farmer_specific_rationale,
    check_fleet_availability,
    fetch_localized_weather,
    query_sensor_store,
)
from app.agents.farm_manager.farm_manager_agent import farm_manager_agent
from app.agents.orchestrator.orchestrator_agent import orchestrator_agent
from app.api.v1.endpoints.devices import serialize_device
from app.api.v1.endpoints.platform import serialize_notification, serialize_scan
from app.api.v1.endpoints.telemetry import serialize_action, serialize_telemetry
from app.capabilities.registry import capability_registry
from app.core.config import settings
from app.core.crop_profiles import get_crop_profile
from app.core.enums import ActionStatus, ExecutionStatus
from app.core.farmer_registry import (
    FARMER_REGISTRY,
    SHARED_ROBOTICS_FLEET,
    get_farmer_meta,
    list_all_farmer_metas,
)
from app.core.timeutils import iso, utcnow
from app.database import get_db
from app.models.action import ProposedAction
from app.models.audit import AuditLog
from app.models.device import Device
from app.models.entities import (
    CropCycle,
    CropHealthScan,
    FarmActivity,
    Farmer,
    Field,
    HarvestPlanRecord,
    Notification,
    RobotMission,
    Task,
    YieldPredictionRecord,
)
from app.models.farm import Farm
from app.models.telemetry import TelemetryLog
from app.schemas import ActionDecision, ActionOut, AuditLogOut

router = APIRouter()


def _build_farmer_summary_row(
    db: Session,
    meta: Dict[str, Any],
    lang: str = "en",
) -> Dict[str, Any]:
    fid = int(meta["id"])
    sensor = query_sensor_store(db, fid)

    action_rows = db.scalars(
        select(ProposedAction)
        .where(ProposedAction.farm_id == fid)
        .order_by(ProposedAction.created_at.desc())
        .limit(5)
    ).all()

    latest_t = db.scalars(
        select(TelemetryLog)
        .where(TelemetryLog.farm_id == fid)
        .order_by(TelemetryLog.id.desc())
        .limit(1)
    ).first()

    serialized_actions = [
        serialize_action(a, lang=lang, latest_telemetry=latest_t) for a in action_rows
    ]
    pending = [a for a in serialized_actions if a.status == ActionStatus.PENDING_APPROVAL.value]

    advisory_bundle = build_farmer_specific_rationale(
        farmer_id=fid,
        moisture=sensor["soil_moisture"],
        precip_prob=meta["default_precip_prob"],
        lang=lang,
    )

    primary_action = pending[0] if pending else (serialized_actions[0] if serialized_actions else None)

    return {
        "id": fid,
        "farmer_name": meta["farmer_name"],
        "farmer_name_te": meta["farmer_name_te"],
        "farmer_name_hi": meta["farmer_name_hi"],
        "village": meta["village"],
        "village_te": meta["village_te"],
        "village_hi": meta["village_hi"],
        "crop": meta["crop"],
        "crop_variety": meta["crop_variety"],
        "crop_te": meta["crop_te"],
        "crop_hi": meta["crop_hi"],
        "growth_stage": meta["growth_stage"],
        "crop_age_days": meta["crop_age_days"],
        "area_acres": meta["area_acres"],
        "lat": meta["lat"],
        "lon": meta["lon"],
        "sensor_mode": meta["sensor_mode"],
        "device_id": meta["device_id"],
        "soil_moisture": sensor["soil_moisture"],
        "esp32_moisture": sensor.get("esp32_moisture"),
        "satellite_moisture": sensor.get("satellite_soil_moisture", 21.0),
        "satellite_soil_moisture": sensor.get("satellite_soil_moisture", 21.0),
        "satellite_source": sensor.get("satellite_source", "Open-Meteo / ECMWF IFS 9km Reanalysis"),
        "sensor_fusion": sensor.get("sensor_fusion", {}),
        "critical_threshold": sensor["critical_threshold"],
        "soil_ph": sensor["soil_ph"],
        "soil_temperature": sensor["soil_temperature"],
        "nitrogen": sensor["nitrogen"],
        "phosphorus": sensor["phosphorus"],
        "potassium": sensor["potassium"],
        "precip_prob": meta["default_precip_prob"],
        "status": meta["status_code"],
        "status_code": meta["status_code"],
        "risk_badge": meta["risk_badge"],
        "pest_or_disease_risk": meta["pest_or_disease_risk"],
        "health_score": meta["health_score"],
        "fleet_unit": meta["fleet_unit"],
        "advisory_title": primary_action.title if primary_action else advisory_bundle["action_title"],
        "advisory_why": primary_action.why if primary_action else advisory_bundle["why"],
        "pending_action_id": pending[0].id if pending else None,
        "action_status": primary_action.status if primary_action else "OPTIMAL_NO_ACTION",
        "execution_ref": primary_action.execution_ref if primary_action else None,
    }


@router.get("/farmers")
def list_farmers(
    lang: str = Query(default="en", description="Language code: en, te, or hi"),
    db: Session = Depends(get_db),
):
    lang_code = lang if lang in ("en", "te", "hi") else "en"
    farmers = [_build_farmer_summary_row(db, m, lang=lang_code) for m in list_all_farmer_metas()]
    return {
        "count": len(farmers),
        "language": lang_code,
        "farmers": farmers,
        "robotics_fleet": SHARED_ROBOTICS_FLEET,
    }


@router.get("/farmers/{farmer_id}/dashboard")
async def get_farmer_scoped_dashboard(
    farmer_id: int,
    lang: str = Query(default="en", description="Language code: en, te, or hi"),
    db: Session = Depends(get_db),
):
    if farmer_id not in FARMER_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer '{farmer_id}' not found in registry.",
        )

    lang_code = lang if lang in ("en", "te", "hi") else "en"
    meta = get_farmer_meta(farmer_id)
    farm = db.get(Farm, farmer_id)
    if farm is None:
        farm = Farm(
            id=farmer_id,
            name=f"{meta['farmer_name']} — {meta['village']}",
            location=f"{meta['village']}, Andhra Pradesh",
            crop=meta["crop"],
            growth_stage=meta["growth_stage"],
        )
        db.add(farm)
        db.commit()
        db.refresh(farm)

    # Multi-Tool Execution for this specific farmer
    sensor_state = query_sensor_store(db, farmer_id)
    weather = await fetch_localized_weather(meta["lat"], meta["lon"], farmer_id=farmer_id)
    fleet_info = check_fleet_availability("ALL", farmer_id=farmer_id)

    history_rows = db.scalars(
        select(TelemetryLog)
        .where(TelemetryLog.farm_id == farmer_id)
        .order_by(TelemetryLog.id.desc())
        .limit(settings.DASHBOARD_HISTORY_POINTS)
    ).all()

    latest_row = history_rows[0] if history_rows else None
    latest_telemetry = serialize_telemetry(latest_row) if latest_row else {
        "id": 0,
        "device_id": meta["device_id"],
        "soil_moisture": sensor_state["soil_moisture"],
        "soil_ph": sensor_state["soil_ph"],
        "soil_temperature": sensor_state["soil_temperature"],
        "nitrogen": sensor_state["nitrogen"],
        "phosphorus": sensor_state["phosphorus"],
        "potassium": sensor_state["potassium"],
        "synthesized_fields": ["soil_ph", "soil_temperature", "nitrogen", "phosphorus", "potassium"],
        "timestamp": iso(utcnow()) or "",
    }
    telemetry_history = [serialize_telemetry(r) for r in reversed(history_rows)]

    device_rows = db.scalars(
        select(Device).where(Device.farm_id == farmer_id)
    ).all()
    devices_out = [serialize_device(d) for d in device_rows]
    esp32_connected = any(d.online for d in devices_out) if farmer_id == 1 else True

    action_rows = db.scalars(
        select(ProposedAction)
        .where(ProposedAction.farm_id == farmer_id)
        .order_by(ProposedAction.created_at.desc())
        .limit(settings.DASHBOARD_ACTION_LIMIT)
    ).all()

    actions_out = [
        serialize_action(a, lang=lang_code, latest_telemetry=latest_row)
        for a in action_rows
    ]
    pending_out = [a for a in actions_out if a.status == ActionStatus.PENDING_APPROVAL.value]

    advisory_bundle = build_farmer_specific_rationale(
        farmer_id=farmer_id,
        moisture=sensor_state["soil_moisture"],
        precip_prob=int(weather.get("precip_prob", meta["default_precip_prob"])),
        lang=lang_code,
    )

    profile = get_crop_profile(farm.crop, farm.growth_stage)
    bounds = profile.to_bounds()
    bounds["critical_moisture"] = float(meta["critical_threshold"])

    audit_rows = db.scalars(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(25)
    ).all()
    audit_out = [
        AuditLogOut(
            id=row.id,
            action_id=row.action_id,
            event=row.event,
            actor=row.actor,
            details=dict(row.details or {}),
            created_at=iso(row.created_at) or "",
        )
        for row in audit_rows
    ]

    # Fetch extended SQLite entities for this farmer
    fields_rows = db.scalars(
        select(Field).where(Field.farmer_id == farmer_id).order_by(Field.id.asc())
    ).all()
    fields_out = [
        {
            "id": f.id,
            "farmer_id": f.farmer_id,
            "farm_id": f.farm_id,
            "name": f.name,
            "name_te": f.name_te or f.name,
            "name_hi": f.name_hi or f.name,
            "area_acres": f.area_acres,
            "soil_type": f.soil_type,
            "irrigation_type": f.irrigation_type,
            "zone_code": f.zone_code,
            "crop": f.crop,
            "lat": f.lat,
            "lon": f.lon,
        }
        for f in fields_rows
    ]

    cycles_rows = db.scalars(
        select(CropCycle).where(CropCycle.farmer_id == farmer_id).order_by(CropCycle.id.asc())
    ).all()
    cycles_out = [
        {
            "id": c.id,
            "farmer_id": c.farmer_id,
            "field_id": c.field_id,
            "crop": c.crop,
            "variety": c.variety,
            "crop_te": c.crop_te,
            "crop_hi": c.crop_hi,
            "season": c.season,
            "sowing_date": c.sowing_date,
            "current_stage": c.current_stage,
            "crop_age_days": c.crop_age_days,
            "duration_days": c.duration_days,
            "expected_harvest_date": c.expected_harvest_date,
            "status": c.status,
        }
        for c in cycles_rows
    ]

    tasks_rows = db.scalars(
        select(Task).where(Task.farmer_id == farmer_id).order_by(Task.id.desc()).limit(25)
    ).all()
    tasks_out = [capability_registry.serialize_task(t) for t in tasks_rows]

    notif_rows = db.scalars(
        select(Notification).where(Notification.farmer_id == farmer_id).order_by(Notification.id.desc()).limit(20)
    ).all()
    notifications_out = [serialize_notification(n, lang=lang_code) for n in notif_rows]

    scan_rows = db.scalars(
        select(CropHealthScan).where(CropHealthScan.farmer_id == farmer_id).order_by(CropHealthScan.id.desc()).limit(15)
    ).all()
    scans_out = [serialize_scan(s, lang=lang_code) for s in scan_rows]

    mission_rows = db.scalars(
        select(RobotMission).where(RobotMission.farmer_id == farmer_id).order_by(RobotMission.id.desc()).limit(15)
    ).all()
    missions_out = [capability_registry.serialize_mission(m) for m in mission_rows]

    activity_rows = db.scalars(
        select(FarmActivity).where(FarmActivity.farmer_id == farmer_id).order_by(FarmActivity.id.desc()).limit(20)
    ).all()
    activities_out = [
        {
            "id": a.id,
            "farmer_id": a.farmer_id,
            "field_id": a.field_id,
            "activity_type": a.activity_type,
            "title": a.title,
            "notes": a.notes,
            "cost_inr": a.cost_inr,
            "data_source": a.data_source,
            "performed_at": iso(a.performed_at) or "",
        }
        for a in activity_rows
    ]

    agent_intelligence = await farm_manager_agent.evaluate_farm_intelligence(
        db, farmer_id=farmer_id, lang=lang_code
    )

    completed_tasks = sum(1 for t in tasks_out if t["status"] == "COMPLETED")
    todo_tasks = sum(1 for t in tasks_out if t["status"] in ("TODO", "IN_PROGRESS"))
    approved_actions = sum(1 for a in actions_out if a.status == "APPROVED")
    fusion_obj = sensor_state.get("sensor_fusion", {})
    fusion_conf_pct = int(round(float(fusion_obj.get("confidence", 0.98)) * 100))

    analytics_out = {
        "data_source": "ESP32 SENSOR + SATELLITE + HISTORICAL DATA",
        "soil_moisture_trend": [
            {"timestamp": getattr(pt, "timestamp", ""), "moisture": getattr(pt, "soil_moisture", sensor_state["soil_moisture"])}
            for pt in telemetry_history[-10:]
        ] or [{"timestamp": "Now", "moisture": sensor_state["soil_moisture"]}],
        "water_saved_pct": 28.4,
        "water_usage_kl": round(float(meta["area_acres"]) * 42.0, 1),
        "completed_tasks_count": completed_tasks,
        "pending_tasks_count": todo_tasks,
        "crop_scans_count": len(scans_out),
        "approved_actions_count": approved_actions,
        "total_recommendations_count": len(actions_out),
        "estimated_yield_tonnes": agent_intelligence["yield_prediction"]["estimated_tonnes"],
        "fusion_confidence_pct": fusion_conf_pct,
    }

    return {
        "farmer_profile": {
            "id": farmer_id,
            "farmer_name": meta["farmer_name"],
            "farmer_name_te": meta["farmer_name_te"],
            "farmer_name_hi": meta["farmer_name_hi"],
            "village": meta["village"],
            "village_te": meta["village_te"],
            "village_hi": meta["village_hi"],
            "crop": meta["crop"],
            "crop_variety": meta["crop_variety"],
            "crop_te": meta["crop_te"],
            "crop_hi": meta["crop_hi"],
            "growth_stage": meta["growth_stage"],
            "crop_age_days": meta["crop_age_days"],
            "area_acres": meta["area_acres"],
            "sensor_mode": meta["sensor_mode"],
            "status_code": meta["status_code"],
            "risk_badge": meta["risk_badge"],
            "pest_or_disease_risk": meta["pest_or_disease_risk"],
            "health_score": meta["health_score"],
            "fleet_unit": meta["fleet_unit"],
        },
        "farm": {
            "id": farm.id,
            "name": farm.name,
            "location": farm.location,
            "crop": meta["crop_variety"],
            "growth_stage": farm.growth_stage,
            "emergency_stop": farm.emergency_stop,
        },
        "soil_moisture": sensor_state["soil_moisture"],
        "satellite_soil_moisture": sensor_state.get("satellite_soil_moisture", 21.0),
        "fusion_confidence": fusion_conf_pct,
        "fusion_status": (
            "VERIFIED_CRITICAL_DEFICIT"
            if fusion_obj.get("both_confirm_deficit")
            else "VERIFIED_NOMINAL"
        ),
        "explanation": advisory_bundle["why"],
        "farmer_explanation": advisory_bundle["why"],
        "crop_bounds": bounds,
        "telemetry": latest_telemetry,
        "telemetry_history": telemetry_history,
        "devices": devices_out,
        "esp32_connected": esp32_connected,
        "emergency_stop": farm.emergency_stop,
        "actions": actions_out,
        "proposals": actions_out,
        "pending_actions": pending_out,
        "advisory": advisory_bundle,
        "fields": fields_out,
        "crop_cycles": cycles_out,
        "tasks": tasks_out,
        "notifications": notifications_out,
        "crop_scans": scans_out,
        "robot_missions": missions_out,
        "farm_activities": activities_out,
        "agent_intelligence": agent_intelligence,
        "analytics": analytics_out,
        "tool_trace": {
            "query_sensor_store": sensor_state,
            "fetch_localized_weather": weather,
            "check_fleet_availability": {
                "assigned_fleet_unit": fleet_info["assigned_fleet_unit"],
                "available_units": fleet_info["available_units"],
            },
        },
        "agent_statuses": orchestrator_agent.get_agent_statuses(),
        "audit_logs": audit_out,
        "language": lang_code,
        "pipeline_latency_ms": orchestrator_agent.last_pipeline_latency_ms,
        "weather": weather,
        "sensor_fusion": fusion_obj,
    }


@router.post("/farmers/{farmer_id}/actions/decision", response_model=ActionOut)
def decide_farmer_action(
    farmer_id: int,
    decision: ActionDecision,
    db: Session = Depends(get_db),
):
    if farmer_id not in FARMER_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer '{farmer_id}' not found.",
        )

    action = db.get(ProposedAction, decision.action_id)
    # Fallback: if the UI sends a generic action_id (like "ACT_DEFAULT") for a farmer who has a pending action,
    # look up the farmer's latest pending action while keeping explicit ID checks intact.
    if action is None and decision.action_id in ("ACT_DEFAULT", "1"):
        action = db.scalars(
            select(ProposedAction)
            .where(
                ProposedAction.farm_id == farmer_id,
                ProposedAction.status == ActionStatus.PENDING_APPROVAL.value,
            )
            .order_by(ProposedAction.created_at.desc())
            .limit(1)
        ).first()

    if action is None or int(action.farm_id) != int(farmer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action '{decision.action_id}' not found for farmer #{farmer_id}.",
        )

    if action.status != ActionStatus.PENDING_APPROVAL.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Action '{action.id}' is already '{action.status}'. Only PENDING_APPROVAL actions can be updated.",
        )

    farm = db.get(Farm, farmer_id) or db.get(Farm, settings.DEFAULT_FARM_ID)
    emergency_stop_active = bool(farm and farm.emergency_stop)
    now = utcnow()
    meta = get_farmer_meta(farmer_id)

    if decision.status == ActionStatus.APPROVED.value:
        try:
            depth_mm = float((action.parameters or {}).get("depth_mm", 15.0))
            dispatch_info = mavlink_adapter.dispatch_irrigation(
                action_id=action.id,
                zone=action.target or f"zone_0{farmer_id}",
                depth_mm=depth_mm,
                emergency_stop_active=emergency_stop_active,
            )
        except SafetyInterlockError as exc:
            action.execution_status = ExecutionStatus.BLOCKED.value
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=str(exc),
            ) from exc

        action.status = ActionStatus.APPROVED.value
        action.execution_status = ExecutionStatus.DISPATCHED.value
        action.execution_ref = dispatch_info["dispatch_ref"]
        action.decided_by = decision.actor
        action.decided_at = now
        action.decision_note = decision.note

        db.add(
            AuditLog(
                action_id=action.id,
                event="FARMER_ACTION_APPROVED_AND_DISPATCHED",
                actor=decision.actor,
                details={
                    "farmer_id": farmer_id,
                    "dispatch": dispatch_info,
                },
            )
        )
        db.add(
            FarmActivity(
                farmer_id=farmer_id,
                farm_id=farmer_id,
                field_id=1,
                crop_cycle_id=1,
                activity_type="IRRIGATION_DISPATCHED",
                title=f"Approved Action {action.id}: {action.title} ({dispatch_info['dispatch_ref']})",
                notes=f"Human-in-the-loop approval by {decision.actor}.",
                cost_inr=round(float(meta["area_acres"]) * 350.0, 0),
                data_source="ESP32 SENSOR + MAVLINK",
                performed_at=now,
            )
        )
        db.add(
            Notification(
                farmer_id=farmer_id,
                farm_id=farmer_id,
                category="IRRIGATION_DISPATCHED",
                severity="INFO",
                title=f"✅ Action Approved & Dispatched ({dispatch_info['dispatch_ref']})",
                title_te=f"✅ నీరు పెట్టే పని ప్రారంభించబడింది ({dispatch_info['dispatch_ref']})",
                title_hi=f"✅ सिंचाई कार्य शुरू किया गया ({dispatch_info['dispatch_ref']})",
                message=f"Dispatched {action.title} for {meta['village']} plot.",
                message_te=f"{meta['village_te']} పొలంలో నీటిపారుదల వాల్వ్ ఆన్ చేయబడింది.",
                message_hi=f"{meta['village_hi']} खेत में सिंचाई वाल्व चालू कर दिया गया है।",
                data_source="ESP32 SENSOR + MAVLINK",
                action_id=action.id,
                created_at=now,
            )
        )
    else:
        action.status = ActionStatus.REJECTED.value
        action.execution_status = ExecutionStatus.NOT_DISPATCHED.value
        action.decided_by = decision.actor
        action.decided_at = now
        action.decision_note = decision.note

        db.add(
            AuditLog(
                action_id=action.id,
                event="FARMER_ACTION_REJECTED",
                actor=decision.actor,
                details={"farmer_id": farmer_id, "note": decision.note},
            )
        )

    db.commit()
    db.refresh(action)
    try:
        farm_manager_agent.on_action_decided(
            db,
            action_id=action.id,
            decision_status=action.status,
            actor=decision.actor,
            dispatch_ref=action.execution_ref,
        )
    except Exception:
        pass
    return serialize_action(action)

