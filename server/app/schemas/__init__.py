"""Pydantic schemas for API requests and responses."""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


class TelemetryIn(BaseModel):
    device_id: str = Field(..., min_length=1, examples=["esp32_zone_01"])
    soil_moisture: float = Field(..., ge=0.0, le=100.0, examples=[18.5])


class TelemetryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    soil_moisture: float
    soil_ph: float
    soil_temperature: float
    nitrogen: float
    phosphorus: float
    potassium: float
    synthesized_fields: List[str] = Field(default_factory=list)
    timestamp: str


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    why: str
    evidence: List[str]
    missing_data: List[str]
    status: str
    agent: str = "soil_agent"
    target: str = "zone_01"
    confidence: float = 0.98
    execution_status: str = "NOT_DISPATCHED"
    execution_ref: Optional[str] = None
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    decision_note: Optional[str] = None
    created_at: Optional[str] = None


class ActionDecision(BaseModel):
    action_id: str = Field(..., min_length=1, examples=["ACT_001"])
    status: Literal["APPROVED", "REJECTED"]
    actor: str = Field(default="farmer_operator")
    note: Optional[str] = None


class EmergencyStopRequest(BaseModel):
    active: bool = True
    actor: str = "farmer_operator"
    reason: Optional[str] = "Manual emergency stop triggered from dashboard"


class AssistantChatIn(BaseModel):
    message: str = Field(..., min_length=1)
    language: Literal["en", "te", "hi"] = "en"


class AssistantChatOut(BaseModel):
    reply: str
    language: str
    context_summary: Dict[str, Any] = Field(default_factory=dict)


class DeviceOut(BaseModel):
    id: str
    farm_id: int
    zone: str
    kind: str
    online: bool
    last_seen: Optional[str] = None
    seconds_since_seen: Optional[float] = None


class AuditLogOut(BaseModel):
    id: int
    action_id: Optional[str] = None
    event: str
    actor: str
    details: Dict[str, Any]
    created_at: str


class DashboardOut(BaseModel):
    farm: Dict[str, Any]
    crop_bounds: Dict[str, Any]
    telemetry: Optional[TelemetryOut] = None
    telemetry_history: List[TelemetryOut] = Field(default_factory=list)
    devices: List[DeviceOut] = Field(default_factory=list)
    esp32_connected: bool = False
    emergency_stop: bool = False
    actions: List[ActionOut] = Field(default_factory=list)
    pending_actions: List[ActionOut] = Field(default_factory=list)
    agent_statuses: List[Dict[str, Any]] = Field(default_factory=list)
    audit_logs: List[AuditLogOut] = Field(default_factory=list)
    language: str = "en"
    pipeline_latency_ms: int = 312
    weather: Dict[str, Any] = Field(default_factory=dict)
    sensor_fusion: Dict[str, Any] = Field(default_factory=dict)

