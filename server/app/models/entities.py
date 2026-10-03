"""Extended SQLAlchemy ORM entities for complete AI FarmWise platform:
Farmer, Field, CropCycle, FarmActivity, Task, Notification, Alert,
CropHealthScan, YieldPredictionRecord, HarvestPlanRecord, AgentRun, RobotMission.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutils import utcnow
from app.database import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    name_te: Mapped[str] = mapped_column(String(120), default="")
    name_hi: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(32), default="+91-98480-12345")
    village: Mapped[str] = mapped_column(String(120), default="")
    village_te: Mapped[str] = mapped_column(String(120), default="")
    village_hi: Mapped[str] = mapped_column(String(120), default="")
    district: Mapped[str] = mapped_column(String(120), default="Guntur / Krishna")
    state: Mapped[str] = mapped_column(String(120), default="Andhra Pradesh")
    preferred_language: Mapped[str] = mapped_column(String(10), default="te")
    lat: Mapped[float] = mapped_column(Float, default=16.3067)
    lon: Mapped[float] = mapped_column(Float, default=80.4365)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Field(Base):
    __tablename__ = "fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(120))
    name_te: Mapped[str] = mapped_column(String(120), default="")
    name_hi: Mapped[str] = mapped_column(String(120), default="")
    area_acres: Mapped[float] = mapped_column(Float, default=2.0)
    soil_type: Mapped[str] = mapped_column(String(80), default="Alluvial / Black Cotton")
    irrigation_type: Mapped[str] = mapped_column(String(80), default="Solar Drip + Smart Valve")
    lat: Mapped[float] = mapped_column(Float, default=16.3067)
    lon: Mapped[float] = mapped_column(Float, default=80.4365)
    zone_code: Mapped[str] = mapped_column(String(40), default="zone_01")
    crop: Mapped[str] = mapped_column(String(80), default="Rice")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CropCycle(Base):
    __tablename__ = "crop_cycles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, index=True)
    crop: Mapped[str] = mapped_column(String(80))
    variety: Mapped[str] = mapped_column(String(120), default="")
    crop_te: Mapped[str] = mapped_column(String(160), default="")
    crop_hi: Mapped[str] = mapped_column(String(160), default="")
    season: Mapped[str] = mapped_column(String(40), default="Kharif 2026")
    sowing_date: Mapped[str] = mapped_column(String(32), default="2026-08-25")
    current_stage: Mapped[str] = mapped_column(String(60), default="Vegetative")
    crop_age_days: Mapped[int] = mapped_column(Integer, default=35)
    duration_days: Mapped[int] = mapped_column(Integer, default=120)
    expected_harvest_date: Mapped[str] = mapped_column(String(32), default="2026-12-23")
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class FarmActivity(Base):
    __tablename__ = "farm_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    crop_cycle_id: Mapped[int] = mapped_column(Integer, default=1)
    activity_type: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(200))
    notes: Mapped[str] = mapped_column(Text, default="")
    cost_inr: Mapped[float] = mapped_column(Float, default=0.0)
    data_source: Mapped[str] = mapped_column(String(60), default="HISTORICAL DATA")
    performed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(200))
    title_te: Mapped[str] = mapped_column(String(240), default="")
    title_hi: Mapped[str] = mapped_column(String(240), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(60), default="FIELD_INSPECTION")
    priority: Mapped[str] = mapped_column(String(32), default="HIGH")
    status: Mapped[str] = mapped_column(String(32), default="TODO", index=True)  # TODO, IN_PROGRESS, COMPLETED, CANCELLED
    assigned_tool: Mapped[str] = mapped_column(String(60), default="FarmerTaskTool")
    source_agent: Mapped[str] = mapped_column(String(60), default="farm_manager_agent")
    due_date: Mapped[str] = mapped_column(String(32), default="Today")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    category: Mapped[str] = mapped_column(String(60), default="IRRIGATION")
    severity: Mapped[str] = mapped_column(String(32), default="HIGH")
    title: Mapped[str] = mapped_column(String(200))
    title_te: Mapped[str] = mapped_column(String(240), default="")
    title_hi: Mapped[str] = mapped_column(String(240), default="")
    message: Mapped[str] = mapped_column(Text)
    message_te: Mapped[str] = mapped_column(Text, default="")
    message_hi: Mapped[str] = mapped_column(Text, default="")
    data_source: Mapped[str] = mapped_column(String(60), default="ESP32 SENSOR")
    action_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    alert_type: Mapped[str] = mapped_column(String(60))
    severity: Mapped[str] = mapped_column(String(32), default="MODERATE")
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    recommendation: Mapped[str] = mapped_column(Text, default="")
    data_source: Mapped[str] = mapped_column(String(60), default="WEATHER API")
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CropHealthScan(Base):
    __tablename__ = "crop_health_scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    crop_cycle_id: Mapped[int] = mapped_column(Integer, default=1)
    crop: Mapped[str] = mapped_column(String(80), default="Chilli")
    image_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    capture_mode: Mapped[str] = mapped_column(String(32), default="CAMERA")
    analysis_mode: Mapped[str] = mapped_column(String(64), default="DETERMINISTIC_DEMO_FALLBACK")
    health_status: Mapped[str] = mapped_column(String(80), default="Healthy")
    possible_issue: Mapped[str] = mapped_column(String(120), default="None Detected")
    severity: Mapped[str] = mapped_column(String(32), default="Low")
    confidence: Mapped[float] = mapped_column(Float, default=0.86)
    recommendation: Mapped[str] = mapped_column(Text, default="")
    recommendation_te: Mapped[str] = mapped_column(Text, default="")
    recommendation_hi: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    explanation_te: Mapped[str] = mapped_column(Text, default="")
    explanation_hi: Mapped[str] = mapped_column(Text, default="")
    data_source: Mapped[str] = mapped_column(String(60), default="AI ESTIMATE (DEMO FALLBACK)")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class YieldPredictionRecord(Base):
    __tablename__ = "yield_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    crop_cycle_id: Mapped[int] = mapped_column(Integer, default=1)
    crop: Mapped[str] = mapped_column(String(80))
    estimated_tonnes: Mapped[float] = mapped_column(Float)
    range_min_tonnes: Mapped[float] = mapped_column(Float)
    range_max_tonnes: Mapped[float] = mapped_column(Float)
    confidence_label: Mapped[str] = mapped_column(String(32), default="Medium (Baseline Agronomic Estimate)")
    factors_positive: Mapped[list] = mapped_column(JSON, default=list)
    factors_negative: Mapped[list] = mapped_column(JSON, default=list)
    methodology: Mapped[str] = mapped_column(
        String(160),
        default="AI ESTIMATE — Baseline Agronomic Formula (Area × Variety Baseline × Moisture/Health Modifiers)",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class HarvestPlanRecord(Base):
    __tablename__ = "harvest_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    crop_cycle_id: Mapped[int] = mapped_column(Integer, default=1)
    crop: Mapped[str] = mapped_column(String(80))
    harvest_window_start: Mapped[str] = mapped_column(String(32))
    harvest_window_end: Mapped[str] = mapped_column(String(32))
    maturity_pct: Mapped[int] = mapped_column(Integer, default=45)
    estimated_yield_tonnes: Mapped[float] = mapped_column(Float, default=3.1)
    preparation_tasks: Mapped[list] = mapped_column(JSON, default=list)
    weather_considerations: Mapped[str] = mapped_column(Text, default="")
    market_yard: Mapped[str] = mapped_column(String(120), default="Guntur / Vijayawada AMC Yard")
    expected_price_per_quintal: Mapped[float] = mapped_column(Float, default=2450.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_code: Mapped[str] = mapped_column(String(40), default="run_001", index=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    goal: Mapped[str] = mapped_column(Text, default="Evaluate farm state and recommend optimal action")
    status: Mapped[str] = mapped_column(String(40), default="COMPLETED", index=True)
    state_history: Mapped[list] = mapped_column(JSON, default=list)
    plan: Mapped[dict] = mapped_column(JSON, default=dict)
    selected_tools: Mapped[list] = mapped_column(JSON, default=list)
    tool_results: Mapped[list] = mapped_column(JSON, default=list)
    decision_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_status: Mapped[str] = mapped_column(String(40), default="NOT_REQUIRED")
    action_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    trigger: Mapped[str] = mapped_column(String(80), default="FARM_MANAGER_ORCHESTRATION")
    selected_capability: Mapped[str] = mapped_column(String(80), default="IrrigationTool")
    workflow_trace: Mapped[dict] = mapped_column(JSON, default=dict)
    summary: Mapped[str] = mapped_column(Text, default="")
    latency_ms: Mapped[int] = mapped_column(Integer, default=312)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class RobotMission(Base):
    __tablename__ = "robot_missions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mission_code: Mapped[str] = mapped_column(String(40), index=True)
    farmer_id: Mapped[int] = mapped_column(Integer, index=True)
    farm_id: Mapped[int] = mapped_column(Integer, index=True)
    field_id: Mapped[int] = mapped_column(Integer, default=1)
    unit_id: Mapped[str] = mapped_column(String(60))
    robot_type: Mapped[str] = mapped_column(String(40))  # SIMULATED_DRONE or SIMULATED_ROVER
    mission_type: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(40), default="COMPLETED")
    state_history: Mapped[list] = mapped_column(JSON, default=list)
    battery_pct: Mapped[int] = mapped_column(Integer, default=92)
    progress_pct: Mapped[int] = mapped_column(Integer, default=100)
    images_captured: Mapped[int] = mapped_column(Integer, default=18)
    findings: Mapped[str] = mapped_column(Text, default="")
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True)
    data_source: Mapped[str] = mapped_column(String(60), default="SIMULATED DRONE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

