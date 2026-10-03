"""Unified Dashboard Endpoint (`GET /api/v1/dashboard?lang=en|te|hi`) and Agent Analyze endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.decision.decision_agent import (
    DEFAULT_SATELLITE_MOISTURE_BY_FARMER,
    fetch_localized_weather,
    generate_neuro_symbolic_rationale,
)
from app.agents.orchestrator.orchestrator_agent import orchestrator_agent
from app.agents.soil.soil_agent import compute_sensor_fusion
from app.api.v1.endpoints.devices import serialize_device
from app.api.v1.endpoints.telemetry import serialize_action, serialize_telemetry
from app.core.config import settings
from app.core.crop_profiles import get_crop_profile
from app.core.enums import ActionStatus
from app.core.timeutils import iso
from app.database import get_db
from app.models.action import ProposedAction
from app.models.audit import AuditLog
from app.models.device import Device
from app.models.farm import Farm
from app.models.telemetry import TelemetryLog
from app.schemas import AuditLogOut, DashboardOut

router = APIRouter()


@router.get("/dashboard", response_model=DashboardOut)
async def get_dashboard(
    lang: str = Query(default="en", description="Active UI language: en, te, or hi"),
    simulate_esp32_offline: bool = Query(
        default=False,
        description="When True, forces ESP32 offline to test automatic satellite soil moisture failover",
    ),
    db: Session = Depends(get_db),
):
    lang_code = lang if lang in ("en", "te", "hi") else "en"

    farm = db.get(Farm, settings.DEFAULT_FARM_ID)
    if farm is None:
        farm = Farm(
            id=settings.DEFAULT_FARM_ID,
            name="FarmWise Demo Farm",
            location="Guntur, Andhra Pradesh",
            crop="Rice",
            growth_stage="Vegetative",
        )
        db.add(farm)
        db.commit()
        db.refresh(farm)

    profile = get_crop_profile(farm.crop, farm.growth_stage)

    history_rows = db.scalars(
        select(TelemetryLog)
        .where(TelemetryLog.farm_id == farm.id)
        .order_by(TelemetryLog.id.desc())
        .limit(settings.DASHBOARD_HISTORY_POINTS)
    ).all()

    latest_row = history_rows[0] if history_rows else None
    latest_telemetry = serialize_telemetry(latest_row) if latest_row else None
    telemetry_history = [serialize_telemetry(r) for r in reversed(history_rows)]

    device_rows = db.scalars(
        select(Device).where(Device.farm_id == farm.id).order_by(Device.id.asc())
    ).all()
    devices_out = [serialize_device(d) for d in device_rows]
    esp32_connected = (any(d.online for d in devices_out)) and (not simulate_esp32_offline)

    weather = await fetch_localized_weather(16.4337, 80.7669, farmer_id=farm.id)
    sat_moisture = float(
        weather.get(
            "satellite_soil_moisture",
            DEFAULT_SATELLITE_MOISTURE_BY_FARMER.get(farm.id, 21.0),
        )
    )

    # If ESP32 is offline and no pending action exists yet, evaluate via satellite failover so proposals are never halted
    if not esp32_connected:
        await orchestrator_agent.evaluate_telemetry(
            db, farm, latest_row, lang=lang_code, esp32_online=False
        )
        db.commit()

    fusion = compute_sensor_fusion(
        esp32_moisture=latest_row.soil_moisture if (latest_row and esp32_connected) else None,
        satellite_moisture=sat_moisture,
        esp32_online=esp32_connected,
        critical_threshold=float(profile.critical_moisture),
    )

    action_rows = db.scalars(
        select(ProposedAction)
        .where(ProposedAction.farm_id == farm.id)
        .order_by(ProposedAction.created_at.desc())
        .limit(settings.DASHBOARD_ACTION_LIMIT)
    ).all()
    actions_out = [
        serialize_action(a, lang=lang_code, latest_telemetry=latest_row)
        for a in action_rows
    ]
    pending_out = [a for a in actions_out if a.status == ActionStatus.PENDING_APPROVAL.value]

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

    return DashboardOut(
        farm={
            "id": farm.id,
            "name": farm.name,
            "location": farm.location,
            "crop": farm.crop,
            "growth_stage": farm.growth_stage,
            "emergency_stop": farm.emergency_stop,
        },
        crop_bounds=profile.to_bounds(),
        telemetry=latest_telemetry,
        telemetry_history=telemetry_history,
        devices=devices_out,
        esp32_connected=esp32_connected,
        emergency_stop=farm.emergency_stop,
        actions=actions_out,
        pending_actions=pending_out,
        agent_statuses=orchestrator_agent.get_agent_statuses(),
        audit_logs=audit_out,
        language=lang_code,
        pipeline_latency_ms=orchestrator_agent.last_pipeline_latency_ms,
        weather=weather,
        sensor_fusion=fusion,
    )


@router.get("/agent/analyze")
async def analyze_live_state(
    lang: str = Query(default="en", description="Language code: en, te, or hi"),
    simulate_esp32_offline: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    """On-demand Multi-Source Sensor Fusion + Neuro-Symbolic LLM evaluation."""
    lang_code = lang if lang in ("en", "te", "hi") else "en"
    latest_row = db.scalars(
        select(TelemetryLog)
        .where(TelemetryLog.farm_id == settings.DEFAULT_FARM_ID)
        .order_by(TelemetryLog.id.desc())
        .limit(1)
    ).first()
    weather = await fetch_localized_weather(16.4337, 80.7669, farmer_id=1)
    sat_moisture = float(weather.get("satellite_soil_moisture", 21.0))

    esp32_online = (latest_row is not None) and (not simulate_esp32_offline)
    fusion = compute_sensor_fusion(
        esp32_moisture=latest_row.soil_moisture if esp32_online else None,
        satellite_moisture=sat_moisture,
        esp32_online=esp32_online,
        critical_threshold=30.0,
    )

    rationale = await generate_neuro_symbolic_rationale(
        moisture=fusion["effective_moisture"],
        critical_threshold=30.0,
        crop="Rice",
        stage="Vegetative",
        soil_ph=latest_row.soil_ph if latest_row else 6.8,
        soil_temp=latest_row.soil_temperature if latest_row else 27.5,
        nitrogen=latest_row.nitrogen if latest_row else 32.0,
        phosphorus=latest_row.phosphorus if latest_row else 20.0,
        potassium=latest_row.potassium if latest_row else 185.0,
        precip_prob=int(weather.get("precip_prob", 5)),
        lang=lang_code,
        farmer_id=1,
        satellite_moisture=sat_moisture,
        fallback_active=fusion["fallback_active"],
    )
    return {
        "language": lang_code,
        "weather": weather,
        "sensor_fusion": fusion,
        "analysis": rationale,
    }

