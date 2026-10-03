"""AgentContext passed to every agent in the reasoning pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class AgentContext:
    """Immutable snapshot of farm telemetry, crop profile, and current state."""

    farm_id: int
    device_id: str
    crop: str
    growth_stage: str
    soil_moisture: float
    soil_ph: float
    soil_temperature: float
    nitrogen: float
    phosphorus: float
    potassium: float
    crop_bounds: Dict[str, Any] = field(default_factory=dict)
    has_pending_irrigation_action: bool = False
    emergency_stop: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    missing_modalities: List[str] = field(default_factory=list)
