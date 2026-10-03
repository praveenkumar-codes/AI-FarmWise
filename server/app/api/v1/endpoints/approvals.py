"""Human-in-the-Loop Approval Gateway (`POST /api/v1/actions/decision`)."""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.mavlink_adapter import SafetyInterlockError, mavlink_adapter
from app.api.v1.endpoints.telemetry import serialize_action
from app.core.config import settings
from app.core.enums import ActionStatus, ExecutionStatus
from app.core.timeutils import utcnow
from app.database import get_db
from app.models.action import ProposedAction
from app.models.audit import AuditLog
from app.models.farm import Farm
from app.schemas import ActionDecision, ActionOut

router = APIRouter()


@router.get("/actions", response_model=List[ActionOut])
def list_actions(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ProposedAction)
        .order_by(ProposedAction.created_at.desc())
        .limit(settings.DASHBOARD_ACTION_LIMIT)
    ).all()
    return [serialize_action(r) for r in rows]


@router.post("/actions/decision", response_model=ActionOut)
def decide_action(decision: ActionDecision, db: Session = Depends(get_db)):
    action = db.get(ProposedAction, decision.action_id)
    if action is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action '{decision.action_id}' not found.",
        )

    # State-transition guard: Only PENDING_APPROVAL actions can be updated.
    if action.status != ActionStatus.PENDING_APPROVAL.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Invalid state transition: action '{action.id}' is already '{action.status}'. "
                "Only actions in PENDING_APPROVAL can be updated."
            ),
        )

    farm = db.get(Farm, action.farm_id) or db.get(Farm, settings.DEFAULT_FARM_ID)
    emergency_stop_active = bool(farm and farm.emergency_stop)

    now = utcnow()

    if decision.status == ActionStatus.APPROVED.value:
        # Execution Safety Interlock: check emergency stop and invoke MAVLink adapter.
        try:
            depth_mm = float((action.parameters or {}).get("depth_mm", 15.0))
            dispatch_info = mavlink_adapter.dispatch_irrigation(
                action_id=action.id,
                zone=action.target or "zone_01",
                depth_mm=depth_mm,
                emergency_stop_active=emergency_stop_active,
            )
        except SafetyInterlockError as exc:
            action.execution_status = ExecutionStatus.BLOCKED.value
            db.add(
                AuditLog(
                    action_id=action.id,
                    event="DISPATCH_BLOCKED_BY_INTERLOCK",
                    actor=decision.actor,
                    details={"reason": str(exc)},
                )
            )
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
                event="ACTION_APPROVED_AND_DISPATCHED",
                actor=decision.actor,
                details={
                    "dispatch": dispatch_info,
                    "note": decision.note,
                },
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
                event="ACTION_REJECTED",
                actor=decision.actor,
                details={"note": decision.note},
            )
        )

    db.commit()
    db.refresh(action)
    try:
        from app.agents.farm_manager.farm_manager_agent import farm_manager_agent

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
