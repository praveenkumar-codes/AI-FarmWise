from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutils import utcnow
from app.database import Base


class Device(Base):
    """A physical field node (ESP32 today; drones/rovers later)."""

    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # == device_id
    farm_id: Mapped[int] = mapped_column(Integer, ForeignKey("farms.id"))
    zone: Mapped[str] = mapped_column(String(40), default="zone_01")
    kind: Mapped[str] = mapped_column(String(40), default="ESP32_SOIL_NODE")
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
