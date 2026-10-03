"""Device Registry & Emergency Stop Safety Interlock (`GET /api/v1/devices`, `POST /api/v1/devices/emergency-stop`)."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Body, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.mavlink_adapter import mavlink_adapter
from app.core.config import settings
from app.core.enums import ExecutionStatus
from app.core.timeutils import iso, utcnow
from app.database import get_db
from app.models.action import ProposedAction
from app.models.audit import AuditLog
from app.models.device import Device
from app.models.farm import Farm
from app.schemas import DeviceOut, EmergencyStopRequest

router = APIRouter()


def serialize_device(dev: Device) -> DeviceOut:
    now = utcnow()
    seconds_since: Optional[float] = None
    online = False
    if dev.last_seen is not None:
        seconds_since = round(max(0.0, (now - dev.last_seen).total_seconds()), 1)
        online = seconds_since <= settings.DEVICE_ONLINE_TIMEOUT_S

    return DeviceOut(
        id=dev.id,
        farm_id=dev.farm_id,
        zone=dev.zone,
        kind=dev.kind,
        online=online,
        last_seen=iso(dev.last_seen),
        seconds_since_seen=seconds_since,
    )


@router.get("/devices", response_model=List[DeviceOut])
def get_devices(db: Session = Depends(get_db)):
    devices = db.scalars(select(Device).order_by(Device.id.asc())).all()
    return [serialize_device(d) for d in devices]


@router.post("/devices/emergency-stop")
def trigger_emergency_stop(
    payload: Optional[EmergencyStopRequest] = Body(default=None),
    db: Session = Depends(get_db),
):
    req = payload or EmergencyStopRequest()
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
        db.flush()

    now = utcnow()
    farm.emergency_stop = bool(req.active)
    farm.emergency_stop_at = now if req.active else None
    farm.emergency_stop_by = req.actor if req.active else None

    aborted_missions = 0
    aborted_actions = 0
    if req.active:
        aborted_missions = mavlink_adapter.abort_all()
        dispatched = db.scalars(
            select(ProposedAction).where(
                ProposedAction.farm_id == farm.id,
                ProposedAction.execution_status == ExecutionStatus.DISPATCHED.value,
            )
        ).all()
        for act in dispatched:
            act.execution_status = ExecutionStatus.ABORTED.value
            aborted_actions += 1

        try:
            from app.models.entities import AgentRun

            active_runs = db.scalars(
                select(AgentRun).where(
                    AgentRun.status.in_(["AWAITING_APPROVAL", "ACTING", "VERIFYING", "EXECUTING"])
                )
            ).all()
            for r in active_runs:
                r.status = "EMERGENCY_STOPPED"
                hist = list(r.state_history or [])
                hist.append(
                    {
                        "state": "EMERGENCY_STOPPED",
                        "detail": f"Global Emergency Stop engaged by {req.actor}: {req.reason}",
                        "timestamp": iso(now) or "",
                    }
                )
                r.state_history = hist
                r.updated_at = now
        except Exception:
            pass

    db.add(
        AuditLog(
            action_id=None,
            event="EMERGENCY_STOP_ENGAGED" if req.active else "EMERGENCY_STOP_RELEASED",
            actor=req.actor,
            details={
                "active": req.active,
                "reason": req.reason,
                "aborted_missions": aborted_missions,
                "aborted_actions": aborted_actions,
            },
        )
    )
    db.commit()

    return {
        "status": "LOCKED" if farm.emergency_stop else "ARMED",
        "emergency_stop": farm.emergency_stop,
        "aborted_missions": aborted_missions,
        "aborted_actions": aborted_actions,
        "timestamp": iso(now),
    }
