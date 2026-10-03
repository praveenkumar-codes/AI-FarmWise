from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutils import utcnow
from app.database import Base


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(200), default="")
    crop: Mapped[str] = mapped_column(String(60), default="Rice")
    growth_stage: Mapped[str] = mapped_column(String(60), default="Vegetative")

    # Global safety interlock. While True, no action may be dispatched.
    emergency_stop: Mapped[bool] = mapped_column(Boolean, default=False)
    emergency_stop_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    emergency_stop_by: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
