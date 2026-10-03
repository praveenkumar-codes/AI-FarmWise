from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutils import utcnow
from app.database import Base


class TelemetryLog(Base):
    """One ingested reading. soil_moisture is always the raw hardware value;
    the remaining chemistry fields are synthesised (see `synthesized_fields`)."""

    __tablename__ = "telemetry_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True)

    soil_moisture: Mapped[float] = mapped_column(Float)  # REAL - ESP32 capacitive sensor
    soil_ph: Mapped[float] = mapped_column(Float)
    soil_temperature: Mapped[float] = mapped_column(Float)
    nitrogen: Mapped[float] = mapped_column(Float)
    phosphorus: Mapped[float] = mapped_column(Float)
    potassium: Mapped[float] = mapped_column(Float)

    synthesized_fields: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
