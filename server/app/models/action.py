from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import ActionStatus, ExecutionStatus
from app.core.timeutils import utcnow
from app.database import Base


class ProposedAction(Base):
    """An agent-proposed action awaiting (or past) human approval."""

    __tablename__ = "proposed_actions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. ACT_001
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    agent: Mapped[str] = mapped_column(String(40))
    type: Mapped[str] = mapped_column(String(60), index=True)
    target: Mapped[str] = mapped_column(String(60))

    title: Mapped[str] = mapped_column(String(200))
    why: Mapped[str] = mapped_column(Text)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    missing_data: Mapped[list] = mapped_column(JSON, default=list)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[str] = mapped_column(
        String(32), default=ActionStatus.PENDING_APPROVAL.value, index=True
    )
    execution_status: Mapped[str] = mapped_column(
        String(32), default=ExecutionStatus.NOT_DISPATCHED.value
    )
    execution_ref: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    decided_by: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    decision_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
