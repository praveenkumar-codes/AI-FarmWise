from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutils import utcnow
from app.database import Base


class AuditLog(Base):
    """Append-only record of every safety-relevant event."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    event: Mapped[str] = mapped_column(String(60), index=True)
    actor: Mapped[str] = mapped_column(String(80), default="system")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
