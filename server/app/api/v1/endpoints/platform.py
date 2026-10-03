"""Complete Platform Endpoints for Farm/Field/Crop Management, Real Camera Crop Health Scanning,
Dynamic Capability Allocation (Drone/Rover/Task Fallback), Persistent Tasks, Notifications, History & Analytics.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.farm_manager.farm_manager_agent import farm_manager_agent
from app.capabilities.registry import capability_registry
from app.core.farmer_registry import FARMER_REGISTRY, get_farmer_meta
from app.core.timeutils import iso, utcnow
from app.database import get_db
from app.models.action import ProposedAction
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

router = APIRouter()


class FieldCreateIn(BaseModel):
    name: str
    area_acres: float = 2.0
    soil_type: str = "Black Cotton Soil"
    irrigation_type: str = "Solar Drip + Smart Valve"
    crop: str = "Chilli (Teja)"
    variety: str = "Teja Guntur"
    current_stage: str = "Vegetative"
    sowing_date: str = "2026-08-25"


class FarmerProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    village: Optional[str] = None
    preferred_language: Optional[str] = None
    crop: Optional[str] = None
    growth_stage: Optional[str] = None
    area_acres: Optional[float] = None


class TaskCreateIn(BaseModel):
    title: str
    description: str = ""
    field_id: int = 1
    category: str = "FIELD_INSPECTION"
    priority: str = "MEDIUM"
    due_date: str = "Today"


class TaskStatusUpdateIn(BaseModel):
    status: str  # TODO, IN_PROGRESS, COMPLETED, CANCELLED


class ActivityCreateIn(BaseModel):
    activity_type: str = "IRRIGATION_CYCLE"
    title: str
    notes: str = ""
    cost_inr: float = 0.0
    field_id: int = 1


class CapabilityDispatchIn(BaseModel):
    farmer_id: int = 1
    field_id: int = 1
    goal: str = "Check Field A for crop stress"
    preferred_tool: str = "DroneTool"  # DroneTool, GroundRobotTool, FarmerTaskTool


class CapabilityAvailabilityIn(BaseModel):
    farmer_id: int = 1
    drone_available: Optional[bool] = None
    rover_available: Optional[bool] = None


def serialize_scan(s: CropHealthScan, lang: str = "en") -> Dict[str, Any]:
    rec = (
        s.recommendation_te
        if lang == "te" and s.recommendation_te
        else (s.recommendation_hi if lang == "hi" and s.recommendation_hi else s.recommendation)
    )
    exp = (
        s.explanation_te
        if lang == "te" and s.explanation_te
        else (s.explanation_hi if lang == "hi" and s.explanation_hi else s.explanation)
    )
    return {
        "id": s.id,
        "farmer_id": s.farmer_id,
        "farm_id": s.farm_id,
        "field_id": s.field_id,
        "crop_cycle_id": s.crop_cycle_id,
        "crop": s.crop,
        "capture_mode": s.capture_mode,
        "analysis_mode": s.analysis_mode,
        "is_simulated_demo": s.analysis_mode != "VISION_MODEL",
        "health_status": s.health_status,
        "possible_issue": s.possible_issue,
        "severity": s.severity,
        "confidence": s.confidence,
        "recommendation": rec,
        "recommendation_en": s.recommendation,
        "recommendation_te": s.recommendation_te,
        "recommendation_hi": s.recommendation_hi,
        "explanation": exp,
        "explanation_en": s.explanation,
        "explanation_te": s.explanation_te,
        "explanation_hi": s.explanation_hi,
        "data_source": s.data_source,
        "image_metadata": dict(s.image_metadata or {}),
        "created_at": iso(s.created_at) or "",
    }


def serialize_notification(n: Notification, lang: str = "en") -> Dict[str, Any]:
    title = (
        n.title_te
        if lang == "te" and n.title_te
        else (n.title_hi if lang == "hi" and n.title_hi else n.title)
    )
    msg = (
        n.message_te
        if lang == "te" and n.message_te
        else (n.message_hi if lang == "hi" and n.message_hi else n.message)
    )
    return {
        "id": n.id,
        "farmer_id": n.farmer_id,
        "farm_id": n.farm_id,
        "category": n.category,
        "severity": n.severity,
        "title": title,
        "message": msg,
        "data_source": n.data_source,
        "action_id": n.action_id,
        "is_read": n.is_read,
        "created_at": iso(n.created_at) or "",
    }


@router.post("/crop-health/scan")
async def scan_crop_health(
    request: Request,
    db: Session = Depends(get_db),
):
    """Step 7 & Step 8: Accepts either JSON or multipart/form-data from real mobile camera or desktop file upload."""
    content_type = (request.headers.get("content-type") or "").lower()
    farmer_id = 1
    farm_id = 1
    field_id = 1
    crop_cycle_id = 1
    capture_mode = "CAMERA"
    image_name = "phone_camera_frame.jpg"
    image_size = 0
    symptom_hint = None
    image_base64 = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        farmer_id = int(form.get("farmer_id") or 1)
        farm_id = int(form.get("farm_id") or farmer_id)
        field_id = int(form.get("field_id") or 1)
        crop_cycle_id = int(form.get("crop_cycle_id") or 1)
        capture_mode = str(form.get("capture_mode") or "CAMERA")
        symptom_hint = str(form.get("symptom_hint") or "")
        upload = form.get("image")
        if upload is not None and hasattr(upload, "read"):
            raw_bytes = await upload.read()
            image_size = len(raw_bytes)
            image_name = getattr(upload, "filename", None) or "camera_upload.jpg"
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        farmer_id = int(body.get("farmer_id") or 1)
        farm_id = int(body.get("farm_id") or farmer_id)
        field_id = int(body.get("field_id") or 1)
        crop_cycle_id = int(body.get("crop_cycle_id") or 1)
        capture_mode = str(body.get("capture_mode") or "CAMERA")
        image_name = str(body.get("image_name") or "camera_frame.jpg")
        symptom_hint = body.get("symptom_hint")
        image_base64 = body.get("image") or body.get("image_base64")
        if isinstance(image_base64, str):
            image_size = len(image_base64)

    scan = await farm_manager_agent.crop_health_agent.analyze_and_persist(
        db,
        farmer_id=farmer_id,
        farm_id=farm_id,
        field_id=field_id,
        crop_cycle_id=crop_cycle_id,
        capture_mode=capture_mode,
        image_name=image_name,
        image_size_bytes=image_size,
        symptom_hint=symptom_hint,
        image_base64=image_base64,
    )
    return serialize_scan(scan)


@router.get("/crop-health/scans")
def list_crop_scans(
    farmer_id: int = Query(default=1),
    lang: str = Query(default="en"),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(CropHealthScan)
        .where(CropHealthScan.farmer_id == farmer_id)
        .order_by(CropHealthScan.id.desc())
        .limit(20)
    ).all()
    return [serialize_scan(r, lang=lang) for r in rows]


@router.put("/farmers/{farmer_id}/profile")
def update_farmer_profile(
    farmer_id: int,
    payload: FarmerProfileUpdateIn,
    db: Session = Depends(get_db),
):
    if farmer_id not in FARMER_REGISTRY:
        raise HTTPException(status_code=404, detail="Farmer not found")

    meta = FARMER_REGISTRY[farmer_id]
    farmer = db.get(Farmer, farmer_id)
    farm = db.get(Farm, farmer_id)

    if payload.name:
        meta["farmer_name"] = payload.name
        if farmer:
            farmer.name = payload.name
    if payload.village:
        meta["village"] = payload.village
        if farmer:
            farmer.village = payload.village
        if farm:
            farm.location = f"{payload.village}, Andhra Pradesh"
    if payload.preferred_language and farmer:
        farmer.preferred_language = payload.preferred_language
    if payload.crop:
        meta["crop"] = payload.crop
        meta["crop_variety"] = payload.crop
        if farm:
            farm.crop = payload.crop
    if payload.growth_stage:
        meta["growth_stage"] = payload.growth_stage
        if farm:
            farm.growth_stage = payload.growth_stage
        active_cycle = db.scalars(
            select(CropCycle).where(CropCycle.farmer_id == farmer_id, CropCycle.status == "ACTIVE")
        ).first()
        if active_cycle:
            active_cycle.current_stage = payload.growth_stage
    if payload.area_acres is not None:
        meta["area_acres"] = float(payload.area_acres)

    db.commit()
    return {"status": "ok", "farmer_id": farmer_id, "updated_profile": get_farmer_meta(farmer_id)}


@router.post("/farmers/{farmer_id}/fields")
def create_farmer_field(
    farmer_id: int,
    payload: FieldCreateIn,
    db: Session = Depends(get_db),
):
    meta = get_farmer_meta(farmer_id)
    now = utcnow()
    new_field = Field(
        farmer_id=farmer_id,
        farm_id=farmer_id,
        name=payload.name,
        name_te=payload.name,
        name_hi=payload.name,
        area_acres=payload.area_acres,
        soil_type=payload.soil_type,
        irrigation_type=payload.irrigation_type,
        lat=float(meta["lat"]),
        lon=float(meta["lon"]),
        zone_code=f"zone_0{farmer_id}",
        crop=payload.crop,
        created_at=now,
    )
    db.add(new_field)
    db.flush()

    cycle = CropCycle(
        farmer_id=farmer_id,
        farm_id=farmer_id,
        field_id=new_field.id,
        crop=payload.crop,
        variety=payload.variety or payload.crop,
        crop_te=payload.crop,
        crop_hi=payload.crop,
        season="Kharif 2026",
        sowing_date=payload.sowing_date,
        current_stage=payload.current_stage,
        crop_age_days=25,
        duration_days=120,
        expected_harvest_date="2026-12-28",
        status="ACTIVE",
        created_at=now,
    )
    db.add(cycle)
    db.commit()
    db.refresh(new_field)
    return {
        "id": new_field.id,
        "farmer_id": new_field.farmer_id,
        "name": new_field.name,
        "area_acres": new_field.area_acres,
        "soil_type": new_field.soil_type,
        "irrigation_type": new_field.irrigation_type,
        "crop": new_field.crop,
        "current_stage": cycle.current_stage,
    }


@router.post("/farmers/{farmer_id}/tasks")
def create_farmer_task(
    farmer_id: int,
    payload: TaskCreateIn,
    db: Session = Depends(get_db),
):
    task = Task(
        farmer_id=farmer_id,
        farm_id=farmer_id,
        field_id=payload.field_id,
        title=payload.title,
        title_te=payload.title,
        title_hi=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        status="TODO",
        assigned_tool="FarmerTaskTool",
        source_agent="farmer_operator",
        due_date=payload.due_date,
        created_at=utcnow(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return capability_registry.serialize_task(task)


@router.patch("/tasks/{task_id}")
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdateIn,
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    valid = ("TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED")
    new_status = payload.status.upper()
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    task.status = new_status
    if new_status == "COMPLETED":
        task.completed_at = utcnow()
    db.commit()
    db.refresh(task)
    return capability_registry.serialize_task(task)


@router.post("/farmers/{farmer_id}/activities")
def create_farm_activity(
    farmer_id: int,
    payload: ActivityCreateIn,
    db: Session = Depends(get_db),
):
    act = FarmActivity(
        farmer_id=farmer_id,
        farm_id=farmer_id,
        field_id=payload.field_id,
        activity_type=payload.activity_type,
        title=payload.title,
        notes=payload.notes,
        cost_inr=payload.cost_inr,
        data_source="FARMER RECORD",
        performed_at=utcnow(),
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return {
        "id": act.id,
        "farmer_id": act.farmer_id,
        "activity_type": act.activity_type,
        "title": act.title,
        "notes": act.notes,
        "cost_inr": act.cost_inr,
        "data_source": act.data_source,
        "performed_at": iso(act.performed_at) or "",
    }


@router.post("/capabilities/dispatch")
def dispatch_capability(
    payload: CapabilityDispatchIn,
    db: Session = Depends(get_db),
):
    """Step 10, 11, 12: Routes a goal through FarmManager & CapabilityRegistry.
    If DroneTool / GroundRobotTool is available -> starts a SIMULATED mission.
    If unavailable -> automatically falls back to FarmerTaskTool and creates a manual farmer task.
    """
    return capability_registry.execute_capability_request(
        db,
        farmer_id=payload.farmer_id,
        field_id=payload.field_id,
        goal=payload.goal,
        preferred_tool=payload.preferred_tool,
    )


@router.post("/capabilities/missions/{mission_id}/advance")
def advance_robot_mission(
    mission_id: int,
    db: Session = Depends(get_db),
):
    updated = capability_registry.advance_mission_state(db, mission_id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Mission not found")
    return updated


@router.post("/capabilities/availability")
def set_capability_availability(
    payload: CapabilityAvailabilityIn,
):
    """Allows toggling simulated Drone/Rover availability to test automatic FarmerTaskTool fallback."""
    return capability_registry.set_availability(
        payload.farmer_id,
        drone_available=payload.drone_available,
        rover_available=payload.rover_available,
    )


class AgentRunRequestIn(BaseModel):
    farmer_id: Any = 1
    farm_id: Any = None
    field_id: Any = 1
    goal: str = "Should I irrigate today?"
    scenario: Optional[str] = None
    lang: str = "en"
    simulate_esp32_offline: Optional[bool] = None
    simulate_drone_unavailable: Optional[bool] = None
    simulate_rover_unavailable: Optional[bool] = None
    simulate_weather_offline: Optional[bool] = None
    simulate_tool_failure: Optional[str] = None
    override_rain_prob: Optional[int] = None
    override_soil_moisture: Optional[float] = None


class AgentVerifyRequestIn(BaseModel):
    new_soil_moisture: Optional[float] = None


@router.post("/agent/run")
async def run_agentic_goal(
    payload: AgentRunRequestIn,
    db: Session = Depends(get_db),
):
    """Executes the full Agentic AI loop (GOAL -> OBSERVE -> PLAN -> DYNAMIC TOOL SELECTION ->
    EXECUTE -> OBSERVE -> EVALUATE -> REPLAN -> HITL APPROVAL -> ACT -> VERIFY -> MEMORY)."""
    return await farm_manager_agent.run_goal(
        db,
        farmer_id=payload.farmer_id,
        farm_id=payload.farm_id,
        field_id=payload.field_id,
        goal=payload.goal,
        scenario=payload.scenario,
        lang=payload.lang,
        simulate_esp32_offline=payload.simulate_esp32_offline,
        simulate_drone_unavailable=payload.simulate_drone_unavailable,
        simulate_rover_unavailable=payload.simulate_rover_unavailable,
        simulate_weather_offline=payload.simulate_weather_offline,
        simulate_tool_failure=payload.simulate_tool_failure,
        override_rain_prob=payload.override_rain_prob,
        override_soil_moisture=payload.override_soil_moisture,
    )


@router.get("/agent/runs")
def list_agent_runs(
    farmer_id: Optional[int] = Query(default=None),
    limit: int = Query(default=15),
    db: Session = Depends(get_db),
):
    from app.models.entities import AgentRun

    stmt = select(AgentRun).order_by(AgentRun.id.desc()).limit(limit)
    if farmer_id is not None:
        stmt = select(AgentRun).where(AgentRun.farmer_id == farmer_id).order_by(AgentRun.id.desc()).limit(limit)
    rows = db.scalars(stmt).all()
    return [farm_manager_agent.serialize_agent_run(r) for r in rows]


@router.get("/agent/runs/{run_id}")
def get_agent_run(
    run_id: str,
    db: Session = Depends(get_db),
):
    from app.models.entities import AgentRun

    run = None
    if run_id.isdigit():
        run = db.get(AgentRun, int(run_id))
    if run is None:
        run = db.scalars(select(AgentRun).where(AgentRun.run_code == run_id).limit(1)).first()
    if run is None:
        raise HTTPException(status_code=404, detail=f"AgentRun '{run_id}' not found")
    return farm_manager_agent.serialize_agent_run(run)


@router.post("/agent/runs/{run_id}/verify")
async def verify_agent_run_action(
    run_id: str,
    payload: Optional[AgentVerifyRequestIn] = Body(default=None),
    db: Session = Depends(get_db),
):
    """Triggers closed-loop post-action verification on an AgentRun."""
    try:
        moisture = payload.new_soil_moisture if payload else None
        return await farm_manager_agent.verify_action_outcome(
            db,
            run_id=run_id,
            new_soil_moisture=moisture,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


