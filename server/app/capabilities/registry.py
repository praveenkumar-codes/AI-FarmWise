"""Dynamic Tool & Capability Registry for AI FarmWise.
Implements structured, allowlisted, schema-validated Agentic Tools:
- SoilTool (get_soil_status)
- WeatherTool (get_weather)
- CropDataTool (get_crop_state)
- CropHistoryTool (get_crop_history)
- RecentScansTool (get_recent_crop_scans)
- VisionTool (scan_crop)
- IrrigationTool (evaluate_irrigation)
- FertilizerTool (evaluate_fertilizer)
- PestDiseaseTool (evaluate_pest_disease)
- YieldTool (estimate_yield)
- HarvestTool (plan_harvest)
- DroneAvailabilityTool (check_drone_availability)
- DroneTool (create_drone_mission — SIMULATED DRONE)
- RoverAvailabilityTool (check_rover_availability)
- RoverTool (create_rover_mission — SIMULATED ROVER)
- FarmerTaskTool (create_farmer_task)
- NotificationTool (create_notification)
- ActionApprovalTool (request_action_approval)
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.decision.decision_agent import (
    build_farmer_specific_rationale,
    fetch_localized_weather,
    query_sensor_store,
)
from app.core.enums import ActionStatus, ExecutionStatus
from app.core.farmer_registry import FARMER_REGISTRY, SHARED_ROBOTICS_FLEET, get_farmer_meta
from app.core.timeutils import iso, utcnow
from app.models.action import ProposedAction
from app.models.audit import AuditLog
from app.models.device import Device
from app.models.entities import (
    Alert,
    CropCycle,
    CropHealthScan,
    FarmActivity,
    Field,
    HarvestPlanRecord,
    Notification,
    RobotMission,
    Task,
    YieldPredictionRecord,
)
from app.models.farm import Farm
from app.models.telemetry import TelemetryLog

DRONE_MISSION_STATES = [
    "MISSION_CREATED",
    "PLANNED",
    "TAKEOFF",
    "SURVEYING",
    "IMAGE_CAPTURE",
    "ANALYZING",
    "RETURNING",
    "COMPLETED",
    "FAILED",
]


class ToolValidationError(Exception):
    """Raised when a tool call violates allowlist, schema, or farmer/field permissions."""


class BaseCapabilityTool:
    name: str = "base_tool"
    aliases: List[str] = []
    category: str = "GENERAL"
    data_source: str = "AI ESTIMATE"
    description: str = "Base capability tool"
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {"farmer_id": {"type": "integer"}, "field_id": {"type": "integer"}},
        "required": ["farmer_id"],
    }
    output_schema: Dict[str, Any] = {"type": "object"}

    def check_availability(self, registry: "CapabilityRegistry", farmer_id: int) -> bool:
        return True

    def to_openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": f"[{self.data_source}] {self.description}",
                "parameters": self.input_schema,
            },
        }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        raise NotImplementedError


class SoilTool(BaseCapabilityTool):
    name = "get_soil_status"
    aliases = ["SoilTool", "SoilSensorTool"]
    category = "SENSING"
    data_source = "ESP32 SENSOR"
    description = "Get current root-zone soil moisture (ESP32 GPIO34 + ECMWF Satellite), pH, temperature, and NPK for a field."
    input_schema = {
        "type": "object",
        "properties": {
            "farmer_id": {"type": "integer", "description": "Authorized farmer ID"},
            "field_id": {"type": "integer", "description": "Target field ID"},
        },
        "required": ["farmer_id"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        sim_offline = bool(kwargs.get("simulate_esp32_offline")) or registry.is_sensor_offline(farmer_id)
        sensor = query_sensor_store(db, farmer_id)
        meta = get_farmer_meta(farmer_id)

        latest_rows = db.scalars(
            select(TelemetryLog)
            .where(TelemetryLog.farm_id == farmer_id)
            .order_by(TelemetryLog.id.desc())
            .limit(3)
        ).all()
        last_known_moisture = float(latest_rows[0].soil_moisture) if latest_rows else float(meta["default_moisture"])

        if sim_offline:
            sat_val = float(sensor.get("satellite_soil_moisture") or 21.0)
            blended_fallback = round((last_known_moisture * 0.4) + (sat_val * 0.6), 1)
            return {
                "tool": self.name,
                "agent": "SoilAgent",
                "status": "DEGRADED_FALLBACK",
                "esp32_online": False,
                "data_source": "SATELLITE + HISTORICAL DATA (ESP32 OFFLINE FALLBACK)",
                "field_id": field_id,
                "soil_moisture": sat_val,
                "last_known_esp32_moisture": last_known_moisture,
                "satellite_soil_moisture": sat_val,
                "blended_estimate_moisture": blended_fallback,
                "critical_threshold": float(sensor["critical_threshold"]),
                "below_threshold": sat_val < float(sensor["critical_threshold"]),
                "soil_ph": float(sensor["soil_ph"]),
                "soil_temperature": float(sensor["soil_temperature"]),
                "nitrogen": float(sensor["nitrogen"]),
                "phosphorus": float(sensor["phosphorus"]),
                "potassium": float(sensor["potassium"]),
                "confidence": 0.68,
                "fallback_reason": "ESP32 GPIO34 sensor offline; fell back to last known telemetry + ECMWF 3-9cm satellite moisture with reduced confidence (0.68).",
            }

        moisture = float(sensor["soil_moisture"])
        crit = float(sensor["critical_threshold"])
        return {
            "tool": self.name,
            "agent": "SoilAgent",
            "status": "OK",
            "esp32_online": True,
            "data_source": "ESP32 SENSOR + SATELLITE",
            "field_id": field_id,
            "soil_moisture": moisture,
            "esp32_moisture": sensor.get("esp32_moisture", moisture),
            "satellite_soil_moisture": float(sensor.get("satellite_soil_moisture", 21.0)),
            "critical_threshold": crit,
            "below_threshold": moisture < crit,
            "soil_ph": float(sensor["soil_ph"]),
            "soil_temperature": float(sensor["soil_temperature"]),
            "nitrogen": float(sensor["nitrogen"]),
            "phosphorus": float(sensor["phosphorus"]),
            "potassium": float(sensor["potassium"]),
            "confidence": float(sensor.get("sensor_fusion", {}).get("confidence", 0.98)),
        }


class WeatherTool(BaseCapabilityTool):
    name = "get_weather"
    aliases = ["WeatherTool"]
    category = "SENSING"
    data_source = "WEATHER API"
    description = "Fetch 6h precipitation probability, temperature, humidity, and wind speed for the farm coordinates."
    input_schema = {
        "type": "object",
        "properties": {
            "farmer_id": {"type": "integer"},
            "field_id": {"type": "integer"},
        },
        "required": ["farmer_id"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        meta = get_farmer_meta(farmer_id)
        sim_weather_offline = bool(kwargs.get("simulate_weather_offline")) or registry.is_weather_offline(farmer_id)
        override_rain = kwargs.get("override_rain_prob")

        if sim_weather_offline:
            cached_prob = int(meta.get("default_precip_prob", 12))
            return {
                "tool": self.name,
                "agent": "WeatherAgent",
                "status": "CACHED_FALLBACK",
                "data_source": "HISTORICAL DATA (CACHED WEATHER — API OFFLINE)",
                "precip_prob": int(override_rain) if override_rain is not None else cached_prob,
                "temperature": 31.0,
                "relative_humidity_2m": 64,
                "wind_speed_kmh": 11.5,
                "confidence": 0.70,
                "fallback_reason": "Weather API unreachable; using cached regional meteorological profile with reduced confidence.",
            }

        weather = await fetch_localized_weather(meta["lat"], meta["lon"], farmer_id=farmer_id)
        rain_prob = int(override_rain) if override_rain is not None else int(weather.get("precip_prob", meta.get("default_precip_prob", 5)))
        return {
            "tool": self.name,
            "agent": "WeatherAgent",
            "status": "OK",
            "data_source": "WEATHER API",
            "precip_prob": rain_prob,
            "temperature": float(weather.get("temperature", 31.2)),
            "relative_humidity_2m": int(weather.get("relative_humidity_2m", 62)),
            "wind_speed_kmh": float(weather.get("wind_speed_kmh", 10.4)),
            "satellite_soil_moisture": weather.get("satellite_soil_moisture", 21.5),
            "confidence": 0.94,
        }


class CropDataTool(BaseCapabilityTool):
    name = "get_crop_state"
    aliases = ["CropDataTool"]
    category = "AGRONOMY"
    data_source = "HISTORICAL DATA"
    description = "Retrieve current crop variety, growth stage, crop age in days, sowing date, and target moisture bounds."
    input_schema = {
        "type": "object",
        "properties": {
            "farmer_id": {"type": "integer"},
            "field_id": {"type": "integer"},
        },
        "required": ["farmer_id"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        meta = get_farmer_meta(farmer_id)
        cycle = db.scalars(
            select(CropCycle)
            .where(CropCycle.farmer_id == farmer_id, CropCycle.status == "ACTIVE")
            .order_by(CropCycle.id.asc())
            .limit(1)
        ).first()
        field_row = db.scalars(
            select(Field).where(Field.farmer_id == farmer_id).order_by(Field.id.asc()).limit(1)
        ).first()

        return {
            "tool": self.name,
            "agent": "CropAgent",
            "status": "OK",
            "data_source": "HISTORICAL DATA",
            "field_id": field_row.id if field_row else field_id,
            "field_name": field_row.name if field_row else f"Field A — {meta['village']}",
            "area_acres": float(field_row.area_acres if field_row else meta["area_acres"]),
            "crop": cycle.crop if cycle else meta["crop"],
            "crop_variety": cycle.variety if cycle and cycle.variety else meta["crop_variety"],
            "growth_stage": cycle.current_stage if cycle else meta["growth_stage"],
            "crop_age_days": int(cycle.crop_age_days if cycle else meta["crop_age_days"]),
            "duration_days": int(cycle.duration_days if cycle else 125),
            "sowing_date": cycle.sowing_date if cycle else "2026-08-25",
            "expected_harvest_date": cycle.expected_harvest_date if cycle else "2026-12-23",
            "critical_moisture_threshold": float(meta["critical_threshold"]),
        }


class CropHistoryTool(BaseCapabilityTool):
    name = "get_crop_history"
    aliases = ["CropHistoryTool"]
    category = "MEMORY"
    data_source = "HISTORICAL DATA"
    description = "Retrieve historical crop cycles, recent farm activities (including yesterday's irrigation), and past recommendations."
    input_schema = {
        "type": "object",
        "properties": {
            "farmer_id": {"type": "integer"},
            "field_id": {"type": "integer"},
        },
        "required": ["farmer_id"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        cycles = db.scalars(
            select(CropCycle).where(CropCycle.farmer_id == farmer_id).order_by(CropCycle.id.desc()).limit(5)
        ).all()
        activities = db.scalars(
            select(FarmActivity).where(FarmActivity.farmer_id == farmer_id).order_by(FarmActivity.id.desc()).limit(8)
        ).all()
        actions = db.scalars(
            select(ProposedAction).where(ProposedAction.farm_id == farmer_id).order_by(ProposedAction.created_at.desc()).limit(5)
        ).all()

        recent_irrigation = any("IRRIGATION" in (a.activity_type or "").upper() for a in activities[:3])
        return {
            "tool": self.name,
            "agent": "CropAgent",
            "status": "OK",
            "data_source": "HISTORICAL DATA",
            "recent_irrigation_performed": recent_irrigation,
            "activities_count": len(activities),
            "recent_activities": [
                {
                    "type": a.activity_type,
                    "title": a.title,
                    "performed_at": iso(a.performed_at) or "",
                }
                for a in activities[:4]
            ],
            "past_cycles": [
                {
                    "crop": c.crop,
                    "season": c.season,
                    "stage": c.current_stage,
                    "status": c.status,
                }
                for c in cycles
            ],
            "recent_actions": [
                {
                    "id": act.id,
                    "type": act.type,
                    "status": act.status,
                    "execution_status": act.execution_status,
                }
                for act in actions
            ],
        }


class RecentScansTool(BaseCapabilityTool):
    name = "get_recent_crop_scans"
    aliases = ["RecentScansTool"]
    category = "VISION"
    data_source = "CAMERA ANALYSIS"
    description = "Retrieve recent leaf/canopy camera scans stored in Farm Memory for this field."
    input_schema = {
        "type": "object",
        "properties": {"farmer_id": {"type": "integer"}, "field_id": {"type": "integer"}},
        "required": ["farmer_id"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        scans = db.scalars(
            select(CropHealthScan)
            .where(CropHealthScan.farmer_id == farmer_id)
            .order_by(CropHealthScan.id.desc())
            .limit(5)
        ).all()
        return {
            "tool": self.name,
            "agent": "CropHealthAgent",
            "status": "OK",
            "data_source": "CAMERA ANALYSIS",
            "scan_count": len(scans),
            "latest_scan": {
                "id": scans[0].id,
                "health_status": scans[0].health_status,
                "possible_issue": scans[0].possible_issue,
                "severity": scans[0].severity,
                "confidence": scans[0].confidence,
                "recommendation": scans[0].recommendation,
                "created_at": iso(scans[0].created_at) or "",
            }
            if scans
            else None,
        }


class VisionTool(BaseCapabilityTool):
    name = "scan_crop"
    aliases = ["VisionTool", "CameraVisionTool"]
    category = "VISION"
    data_source = "CAMERA ANALYSIS"
    description = "Capture or analyze a crop leaf image using the phone camera pipeline and CropHealthAgent."
    input_schema = {
        "type": "object",
        "properties": {
            "farmer_id": {"type": "integer"},
            "field_id": {"type": "integer"},
            "symptom_hint": {"type": "string"},
            "image_name": {"type": "string"},
        },
        "required": ["farmer_id"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        from app.agents.farm_manager.farm_manager_agent import CropHealthAgent

        agent = CropHealthAgent()
        scan = await agent.analyze_and_persist(
            db,
            farmer_id=farmer_id,
            farm_id=farmer_id,
            field_id=field_id,
            capture_mode=str(kwargs.get("capture_mode") or "AGENT_VISION_TOOL"),
            image_name=str(kwargs.get("image_name") or "agent_leaf_inspection.jpg"),
            symptom_hint=kwargs.get("symptom_hint") or "leaf_spot_stress",
            image_base64=kwargs.get("image_base64"),
        )
        return {
            "tool": self.name,
            "agent": "CropHealthAgent",
            "status": "OK",
            "data_source": "CAMERA ANALYSIS (AI ESTIMATE DEMO FALLBACK)",
            "scan_id": scan.id,
            "health_status": scan.health_status,
            "possible_issue": scan.possible_issue,
            "severity": scan.severity,
            "confidence": scan.confidence,
            "recommendation": scan.recommendation,
            "explanation": scan.explanation,
        }


class IrrigationTool(BaseCapabilityTool):
    name = "evaluate_irrigation"
    aliases = ["IrrigationTool"]
    category = "ACTUATION"
    data_source = "ESP32 SENSOR + WEATHER API"
    description = "Run IrrigationAgent domain analysis on soil moisture, rain forecast, and crop stage to determine if irrigation should be dispatched or delayed."
    input_schema = {
        "type": "object",
        "properties": {
            "farmer_id": {"type": "integer"},
            "field_id": {"type": "integer"},
            "soil_moisture": {"type": "number"},
            "precip_prob": {"type": "integer"},
        },
        "required": ["farmer_id"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        from app.agents.farm_manager.farm_manager_agent import IrrigationAgent

        meta = get_farmer_meta(farmer_id)
        sensor = kwargs.get("sensor_obs") or {
            "soil_moisture": kwargs.get("soil_moisture", meta["default_moisture"]),
            "critical_threshold": meta["critical_threshold"],
        }
        weather = kwargs.get("weather_obs") or {
            "precip_prob": kwargs.get("precip_prob", meta["default_precip_prob"]),
        }
        res = IrrigationAgent().evaluate(farmer_id, sensor, weather, lang=str(kwargs.get("lang") or "en"))
        return {
            "tool": self.name,
            "agent": "IrrigationAgent",
            "status": "OK",
            **res,
        }


class FertilizerTool(BaseCapabilityTool):
    name = "evaluate_fertilizer"
    aliases = ["FertilizerTool"]
    category = "ADVISORY"
    data_source = "AI ESTIMATE"
    description = "Run FertilizerAgent to compute NPK and pH top-dressing schedule based on soil moisture and rain risk."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        from app.agents.farm_manager.farm_manager_agent import FertilizerAgent

        sensor = kwargs.get("sensor_obs") or query_sensor_store(db, farmer_id)
        weather = kwargs.get("weather_obs") or {"precip_prob": get_farmer_meta(farmer_id)["default_precip_prob"]}
        res = FertilizerAgent().evaluate(farmer_id, sensor, weather, lang=str(kwargs.get("lang") or "en"))
        return {"tool": self.name, "agent": "FertilizerAgent", "status": "OK", **res}


class PestDiseaseTool(BaseCapabilityTool):
    name = "evaluate_pest_disease"
    aliases = ["PestDiseaseTool"]
    category = "ADVISORY"
    data_source = "WEATHER API + CAMERA ANALYSIS"
    description = "Run PestDiseaseAgent combining microclimate humidity/temperature with the latest leaf camera scan."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        from app.agents.farm_manager.farm_manager_agent import PestDiseaseAgent

        sensor = kwargs.get("sensor_obs") or query_sensor_store(db, farmer_id)
        weather = kwargs.get("weather_obs") or {"precip_prob": 10, "relative_humidity_2m": 68, "temperature": 31.5}
        latest_scan = db.scalars(
            select(CropHealthScan)
            .where(CropHealthScan.farmer_id == farmer_id)
            .order_by(CropHealthScan.id.desc())
            .limit(1)
        ).first()
        res = PestDiseaseAgent().evaluate(farmer_id, sensor, weather, latest_scan=latest_scan)
        return {"tool": self.name, "agent": "PestDiseaseAgent", "status": "OK", **res}


class YieldTool(BaseCapabilityTool):
    name = "estimate_yield"
    aliases = ["YieldTool"]
    category = "ADVISORY"
    data_source = "AI ESTIMATE"
    description = "Run YieldPredictionAgent to estimate harvest tonnage and positive/negative yield modifiers."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        from app.agents.farm_manager.farm_manager_agent import YieldPredictionAgent

        meta = get_farmer_meta(farmer_id)
        sensor = kwargs.get("sensor_obs") or query_sensor_store(db, farmer_id)
        weather = kwargs.get("weather_obs") or {"precip_prob": meta["default_precip_prob"]}
        res = YieldPredictionAgent().evaluate(farmer_id, sensor, weather, float(meta["area_acres"]))
        return {"tool": self.name, "agent": "YieldPredictionAgent", "status": "OK", **res}


class HarvestTool(BaseCapabilityTool):
    name = "plan_harvest"
    aliases = ["HarvestTool"]
    category = "ADVISORY"
    data_source = "AI ESTIMATE + WEATHER API"
    description = "Run HarvestPlanningAgent to determine optimal harvest window, maturity %, market yard, and preparation checklist."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        from app.agents.farm_manager.farm_manager_agent import HarvestPlanningAgent, YieldPredictionAgent

        meta = get_farmer_meta(farmer_id)
        sensor = kwargs.get("sensor_obs") or query_sensor_store(db, farmer_id)
        weather = kwargs.get("weather_obs") or {"precip_prob": meta["default_precip_prob"]}
        yield_est = kwargs.get("yield_obs") or YieldPredictionAgent().evaluate(
            farmer_id, sensor, weather, float(meta["area_acres"])
        )
        res = HarvestPlanningAgent().evaluate(farmer_id, yield_est, weather)
        return {"tool": self.name, "agent": "HarvestPlanningAgent", "status": "OK", **res}


class DroneAvailabilityTool(BaseCapabilityTool):
    name = "check_drone_availability"
    aliases = ["DroneAvailabilityTool"]
    category = "ROBOTICS"
    data_source = "SIMULATED DRONE"
    description = "Check whether the SIMULATED DRONE (UAV-ALPHA) is available for aerial field inspection."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        avail = registry.check_availability(farmer_id)
        if kwargs.get("simulate_drone_unavailable") is True:
            avail["drone_available"] = False
            avail["drone_reason"] = "SIMULATED DRONE UAV-ALPHA offline/unavailable -> Replan required"
        elif kwargs.get("simulate_drone_unavailable") is False:
            avail["drone_available"] = True
            avail["drone_reason"] = "SIMULATED DRONE UAV-ALPHA ready on standby"
        return {
            "tool": self.name,
            "agent": "DroneAgent",
            "status": "OK",
            "data_source": "SIMULATED DRONE",
            "drone_available": avail["drone_available"],
            "drone_unit": avail["drone_unit"],
            "reason": avail["drone_reason"],
        }


class DroneTool(BaseCapabilityTool):
    name = "create_drone_mission"
    aliases = ["DroneTool"]
    category = "ROBOTICS"
    data_source = "SIMULATED DRONE"
    description = "Create and execute a SIMULATED DRONE aerial survey mission over the specified field."

    def check_availability(self, registry: "CapabilityRegistry", farmer_id: int) -> bool:
        return bool(registry.check_availability(farmer_id)["drone_available"])

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        avail = registry.check_availability(farmer_id)
        if kwargs.get("simulate_drone_unavailable") is True or not avail["drone_available"]:
            return {
                "tool": self.name,
                "agent": "DroneAgent",
                "status": "UNAVAILABLE",
                "drone_available": False,
                "data_source": "SIMULATED DRONE",
                "reason": avail["drone_reason"] if not avail["drone_available"] else "Simulated Drone marked unavailable",
            }

        meta = get_farmer_meta(farmer_id)
        now = utcnow()
        code = f"DRN-SIM-{uuid.uuid4().hex[:6].upper()}"
        goal_str = str(kwargs.get("goal") or "Aerial Crop Stress & Canopy NDVI Survey")
        mission = RobotMission(
            mission_code=code,
            farmer_id=farmer_id,
            farm_id=farmer_id,
            field_id=field_id,
            unit_id="UAV-ALPHA",
            robot_type="SIMULATED_DRONE",
            mission_type=goal_str,
            state="SURVEYING",
            state_history=["MISSION_CREATED", "PLANNED", "TAKEOFF", "SURVEYING"],
            battery_pct=91,
            progress_pct=60,
            images_captured=14,
            findings=(
                f"SIMULATED DRONE mission {code} surveyed Field #{field_id} ({meta['village']}): "
                f"Captured 14 multispectral frames for {meta['crop_variety']}. Localized moisture/canopy stress mapped in NE quadrant."
            ),
            is_simulated=True,
            data_source="SIMULATED DRONE",
            created_at=now,
            updated_at=now,
        )
        db.add(mission)
        db.add(
            Notification(
                farmer_id=farmer_id,
                farm_id=farmer_id,
                category="DRONE_MISSION",
                severity="INFO",
                title=f"SIMULATED DRONE Mission {code} Dispatched",
                title_te=f"సిమ్యులేటెడ్ డ్రోన్ మిషన్ ({code}) ప్రారంభించబడింది",
                title_hi=f"सिम्युलेटेड ड्रोन मिशन ({code}) शुरू किया गया",
                message=mission.findings,
                message_te=f"{meta['village_te']} పొలంలో సిమ్యులేటెడ్ డ్రోన్ పంట పరిశీలన చేస్తోంది.",
                message_hi=f"{meta['village_hi']} खेत में सिम्युलेटेड ड्रोन सर्वेक्षण कर रहा है।",
                data_source="SIMULATED DRONE",
                created_at=now,
            )
        )
        db.commit()
        db.refresh(mission)
        return {
            "tool": self.name,
            "agent": "DroneAgent",
            "status": "OK",
            "drone_available": True,
            "is_simulated": True,
            "data_source": "SIMULATED DRONE",
            "mission": registry.serialize_mission(mission),
        }


class RoverAvailabilityTool(BaseCapabilityTool):
    name = "check_rover_availability"
    aliases = ["RoverAvailabilityTool"]
    category = "ROBOTICS"
    data_source = "SIMULATED ROVER"
    description = "Check whether the SIMULATED ROVER ground robot is available in the farmer's sector."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        avail = registry.check_availability(farmer_id)
        if kwargs.get("simulate_rover_unavailable") is True:
            avail["rover_available"] = False
        return {
            "tool": self.name,
            "agent": "RoverAgent",
            "status": "OK",
            "data_source": "SIMULATED ROVER",
            "rover_available": avail["rover_available"],
            "rover_unit": avail["rover_unit"],
            "reason": avail["rover_reason"],
        }


class RoverTool(BaseCapabilityTool):
    name = "create_rover_mission"
    aliases = ["RoverTool", "GroundRobotTool"]
    category = "ROBOTICS"
    data_source = "SIMULATED ROVER"
    description = "Create and execute a SIMULATED ROVER proximal soil/stem inspection mission."

    def check_availability(self, registry: "CapabilityRegistry", farmer_id: int) -> bool:
        return bool(registry.check_availability(farmer_id)["rover_available"])

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        avail = registry.check_availability(farmer_id)
        if kwargs.get("simulate_rover_unavailable") is True or not avail["rover_available"]:
            return {
                "tool": self.name,
                "agent": "RoverAgent",
                "status": "UNAVAILABLE",
                "rover_available": False,
                "data_source": "SIMULATED ROVER",
                "reason": avail["rover_reason"],
            }

        meta = get_farmer_meta(farmer_id)
        now = utcnow()
        code = f"RVR-SIM-{uuid.uuid4().hex[:6].upper()}"
        mission = RobotMission(
            mission_code=code,
            farmer_id=farmer_id,
            farm_id=farmer_id,
            field_id=field_id,
            unit_id="UGV-ROVER-02" if farmer_id == 2 else "UGV-ROVER-01",
            robot_type="SIMULATED_ROVER",
            mission_type=str(kwargs.get("goal") or "Proximal Soil Core & Stem Inspection"),
            state="SURVEYING",
            state_history=["MISSION_CREATED", "PLANNED", "SURVEYING"],
            battery_pct=86,
            progress_pct=50,
            images_captured=8,
            findings=(
                f"SIMULATED ROVER mission {code} active in Field #{field_id} ({meta['village']}): "
                f"Root-zone EC/pH nominal for {meta['crop_variety']}."
            ),
            is_simulated=True,
            data_source="SIMULATED ROVER",
            created_at=now,
            updated_at=now,
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)
        return {
            "tool": self.name,
            "agent": "RoverAgent",
            "status": "OK",
            "rover_available": True,
            "is_simulated": True,
            "data_source": "SIMULATED ROVER",
            "mission": registry.serialize_mission(mission),
        }


class FarmerTaskTool(BaseCapabilityTool):
    name = "create_farmer_task"
    aliases = ["FarmerTaskTool"]
    category = "HUMAN_TASK"
    data_source = "AI ESTIMATE"
    description = "Create a persistent actionable task in the farmer's task list (also used when Drone/Rover hardware is unavailable)."
    input_schema = {
        "type": "object",
        "properties": {
            "farmer_id": {"type": "integer"},
            "field_id": {"type": "integer"},
            "title": {"type": "string"},
            "description": {"type": "string"},
            "category": {"type": "string"},
            "priority": {"type": "string"},
        },
        "required": ["farmer_id", "title"],
    }

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        meta = get_farmer_meta(farmer_id)
        now = utcnow()
        title = str(
            kwargs.get("title")
            or f"Inspect Field #{field_id} ({meta['crop_variety']}) in {meta['village']}"
        )
        desc = str(
            kwargs.get("description")
            or "Created by FarmManagerAgent via FarmerTaskTool."
        )
        task = Task(
            farmer_id=farmer_id,
            farm_id=farmer_id,
            field_id=field_id,
            title=title,
            title_te=str(kwargs.get("title_te") or f"పొలం #{field_id} పరిశీలన: {title}"),
            title_hi=str(kwargs.get("title_hi") or f"खेत #{field_id} निरीक्षण: {title}"),
            description=desc,
            category=str(kwargs.get("category") or "FIELD_INSPECTION"),
            priority=str(kwargs.get("priority") or "HIGH"),
            status="TODO",
            assigned_tool="FarmerTaskTool",
            source_agent=str(kwargs.get("source_agent") or "farm_manager_agent"),
            due_date="Today",
            created_at=now,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return {
            "tool": self.name,
            "agent": "FarmManagerAgent",
            "status": "OK",
            "data_source": "AI ESTIMATE",
            "task": registry.serialize_task(task),
        }


class NotificationTool(BaseCapabilityTool):
    name = "create_notification"
    aliases = ["NotificationTool"]
    category = "COMMUNICATION"
    data_source = "AI ESTIMATE"
    description = "Send a localized notification/alert to the farmer and admin feed."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        now = utcnow()
        title = str(kwargs.get("title") or "AI Farm Manager Advisory")
        msg = str(kwargs.get("message") or "New farm recommendation available.")
        notif = Notification(
            farmer_id=farmer_id,
            farm_id=farmer_id,
            category=str(kwargs.get("category") or "AGENT_ADVISORY"),
            severity=str(kwargs.get("severity") or "HIGH"),
            title=title,
            title_te=str(kwargs.get("title_te") or title),
            title_hi=str(kwargs.get("title_hi") or title),
            message=msg,
            message_te=str(kwargs.get("message_te") or msg),
            message_hi=str(kwargs.get("message_hi") or msg),
            data_source=str(kwargs.get("data_source") or "AI ESTIMATE"),
            action_id=kwargs.get("action_id"),
            is_read=False,
            created_at=now,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return {
            "tool": self.name,
            "agent": "FarmManagerAgent",
            "status": "OK",
            "notification_id": notif.id,
            "title": notif.title,
        }


class ActionApprovalTool(BaseCapabilityTool):
    name = "request_action_approval"
    aliases = ["ActionApprovalTool"]
    category = "HITL_SAFETY"
    data_source = "ESP32 SENSOR + WEATHER API"
    description = "Create or link a safety-interlocked ProposedAction in PENDING_APPROVAL state for Human-in-the-Loop review."

    async def execute(
        self,
        db: Session,
        registry: "CapabilityRegistry",
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        meta = get_farmer_meta(farmer_id)
        farm = db.get(Farm, farmer_id) or db.get(Farm, 1)
        if farm and farm.emergency_stop:
            return {
                "tool": self.name,
                "agent": "FarmManagerAgent",
                "status": "EMERGENCY_STOPPED",
                "approval_required": True,
                "approval_status": "BLOCKED_BY_EMERGENCY_STOP",
                "action_id": None,
                "reason": "Global Emergency Stop is engaged; physical action proposal/dispatch is locked out.",
            }

        # Check if there is already a PENDING_APPROVAL action for this farmer
        existing = db.scalars(
            select(ProposedAction)
            .where(
                ProposedAction.farm_id == farmer_id,
                ProposedAction.status == ActionStatus.PENDING_APPROVAL.value,
            )
            .order_by(ProposedAction.created_at.desc())
            .limit(1)
        ).first()

        moisture = float(kwargs.get("soil_moisture", meta["default_moisture"]))
        rain_prob = int(kwargs.get("precip_prob", meta["default_precip_prob"]))
        depth_mm = float(kwargs.get("depth_mm") or meta.get("action_depth_mm") or 15.0)
        confidence = float(kwargs.get("confidence", 0.94))

        if existing is not None:
            return {
                "tool": self.name,
                "agent": "FarmManagerAgent",
                "status": "AWAITING_APPROVAL",
                "approval_required": True,
                "approval_status": existing.status,
                "action_id": existing.id,
                "title": existing.title,
                "why": existing.why,
            }

        action_id = f"ACT_AG_{uuid.uuid4().hex[:6].upper()}"
        i18n_en = build_farmer_specific_rationale(
            farmer_id=farmer_id, moisture=moisture, precip_prob=rain_prob, lang="en"
        )
        i18n_te = build_farmer_specific_rationale(
            farmer_id=farmer_id, moisture=moisture, precip_prob=rain_prob, lang="te"
        )
        i18n_hi = build_farmer_specific_rationale(
            farmer_id=farmer_id, moisture=moisture, precip_prob=rain_prob, lang="hi"
        )

        proposal = ProposedAction(
            id=action_id,
            farm_id=farmer_id,
            type="IRRIGATION_DISPATCH",
            title=str(kwargs.get("title") or i18n_en["action_title"]),
            why=str(kwargs.get("why") or i18n_en["why"]),
            evidence=list(kwargs.get("evidence") or i18n_en["evidence"]),
            missing_data=["Drone Aerial NDVI Imagery"],
            status=ActionStatus.PENDING_APPROVAL.value,
            agent="farm_manager_agent",
            target=f"zone_0{farmer_id}",
            confidence=confidence,
            execution_status=ExecutionStatus.NOT_DISPATCHED.value,
            parameters={
                "depth_mm": depth_mm,
                "moisture": moisture,
                "precip_prob": rain_prob,
                "field_id": field_id,
                "i18n": {"en": i18n_en, "te": i18n_te, "hi": i18n_hi},
            },
            created_at=utcnow(),
        )
        db.add(proposal)
        db.add(
            AuditLog(
                action_id=action_id,
                event="AGENT_PROPOSED_ACTION_PENDING_HITL",
                actor="farm_manager_agent",
                details={"farmer_id": farmer_id, "field_id": field_id, "moisture": moisture, "rain_prob": rain_prob},
            )
        )
        db.commit()
        db.refresh(proposal)
        return {
            "tool": self.name,
            "agent": "FarmManagerAgent",
            "status": "AWAITING_APPROVAL",
            "approval_required": True,
            "approval_status": proposal.status,
            "action_id": proposal.id,
            "title": proposal.title,
            "why": proposal.why,
        }


class CapabilityRegistry:
    """Dynamic capability allocator and allowlisted tool executor used by FarmManagerAgent."""

    CAPABILITY_CATALOG: List[Dict[str, Any]] = [
        {
            "name": "WeatherTool",
            "tool_id": "get_weather",
            "category": "SENSING",
            "data_source": "WEATHER API",
            "description": "Queries Open-Meteo 6h precipitation probability, air temperature, humidity, and wind.",
        },
        {
            "name": "SoilSensorTool",
            "tool_id": "get_soil_status",
            "category": "SENSING",
            "data_source": "ESP32 SENSOR + SATELLITE",
            "description": "Reads physical ESP32 GPIO34 capacitance probe fused with ECMWF 3-9cm satellite moisture.",
        },
        {
            "name": "CropDataTool",
            "tool_id": "get_crop_state",
            "category": "AGRONOMY",
            "data_source": "HISTORICAL DATA",
            "description": "Loads active crop variety, growth stage, sowing date, and target moisture bounds.",
        },
        {
            "name": "CropHistoryTool",
            "tool_id": "get_crop_history",
            "category": "MEMORY",
            "data_source": "HISTORICAL DATA",
            "description": "Retrieves past crop cycles, recent farm activities, and prior irrigation history.",
        },
        {
            "name": "CameraVisionTool",
            "tool_id": "scan_crop",
            "category": "VISION",
            "data_source": "CAMERA ANALYSIS",
            "description": "Analyzes smartphone camera or uploaded crop leaf photos for disease lesions and chlorosis.",
        },
        {
            "name": "IrrigationTool",
            "tool_id": "evaluate_irrigation",
            "category": "ACTUATION",
            "data_source": "ESP32 SENSOR + MAVLINK",
            "description": "Evaluates irrigation need and dispatches safety-interlocked MAVLink / solenoid valve cycles upon HITL approval.",
        },
        {
            "name": "FertilizerTool",
            "tool_id": "evaluate_fertilizer",
            "category": "ADVISORY",
            "data_source": "AI ESTIMATE",
            "description": "Computes stage-specific NPK & pH nutrient split doses grounded in root-zone telemetry.",
        },
        {
            "name": "PestDiseaseTool",
            "tool_id": "evaluate_pest_disease",
            "category": "ADVISORY",
            "data_source": "WEATHER API + CAMERA ANALYSIS",
            "description": "Evaluates pest & fungal disease pressure from humidity, temperature, and leaf scans.",
        },
        {
            "name": "YieldTool",
            "tool_id": "estimate_yield",
            "category": "ADVISORY",
            "data_source": "AI ESTIMATE",
            "description": "Estimates harvest tonnage and positive/negative yield drivers.",
        },
        {
            "name": "HarvestTool",
            "tool_id": "plan_harvest",
            "category": "ADVISORY",
            "data_source": "AI ESTIMATE + WEATHER API",
            "description": "Computes optimal harvest window, maturity index, and market preparation checklist.",
        },
        {
            "name": "DroneTool",
            "tool_id": "create_drone_mission",
            "category": "ROBOTICS",
            "data_source": "SIMULATED DRONE",
            "description": "Dispatches a SIMULATED DRONE aerial survey mission across 8 flight states when UAV is available.",
        },
        {
            "name": "GroundRobotTool",
            "tool_id": "create_rover_mission",
            "category": "ROBOTICS",
            "data_source": "SIMULATED ROVER",
            "description": "Dispatches a SIMULATED ROVER proximal soil/pest mission when UGV is available in sector.",
        },
        {
            "name": "FarmerTaskTool",
            "tool_id": "create_farmer_task",
            "category": "HUMAN_TASK",
            "data_source": "AI ESTIMATE",
            "description": "Creates a persistent manual task for the farmer when autonomous drone/rover hardware is unavailable.",
        },
        {
            "name": "NotificationTool",
            "tool_id": "create_notification",
            "category": "COMMUNICATION",
            "data_source": "AI ESTIMATE",
            "description": "Persists multilingual farm alerts and task reminders in the farmer notification inbox.",
        },
    ]

    def __init__(self) -> None:
        self._drone_override_unavailable: Dict[int, bool] = {}
        self._rover_override_unavailable: Dict[int, bool] = {}
        self._sensor_override_offline: Dict[int, bool] = {}
        self._weather_override_offline: Dict[int, bool] = {}
        self._tools_by_name: Dict[str, BaseCapabilityTool] = {}

        tool_instances: List[BaseCapabilityTool] = [
            SoilTool(),
            WeatherTool(),
            CropDataTool(),
            CropHistoryTool(),
            RecentScansTool(),
            VisionTool(),
            IrrigationTool(),
            FertilizerTool(),
            PestDiseaseTool(),
            YieldTool(),
            HarvestTool(),
            DroneAvailabilityTool(),
            DroneTool(),
            RoverAvailabilityTool(),
            RoverTool(),
            FarmerTaskTool(),
            NotificationTool(),
            ActionApprovalTool(),
        ]
        for tool in tool_instances:
            self._tools_by_name[tool.name] = tool
            for alias in tool.aliases:
                self._tools_by_name[alias] = tool

    def get_tool(self, name: str) -> BaseCapabilityTool:
        if name not in self._tools_by_name:
            raise ToolValidationError(f"Tool '{name}' is not in the allowlisted CapabilityRegistry.")
        return self._tools_by_name[name]

    def list_openai_tools(self) -> List[Dict[str, Any]]:
        seen = set()
        schemas = []
        for tool in self._tools_by_name.values():
            if tool.name not in seen:
                seen.add(tool.name)
                schemas.append(tool.to_openai_schema())
        return schemas

    def validate_and_resolve(self, tool_name: str, farmer_id: int, field_id: int = 1) -> BaseCapabilityTool:
        if int(farmer_id) not in FARMER_REGISTRY:
            raise ToolValidationError(f"Unauthorized or unknown farmer_id={farmer_id}.")
        if int(field_id) < 1:
            raise ToolValidationError(f"Invalid field_id={field_id}.")
        return self.get_tool(tool_name)

    async def execute_tool(
        self,
        db: Session,
        tool_name: str,
        *,
        farmer_id: int,
        field_id: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Validates tool against allowlist & farmer/field scope, then executes it."""
        tool = self.validate_and_resolve(tool_name, farmer_id=farmer_id, field_id=field_id)
        simulated_fail_tool = kwargs.get("simulate_tool_failure")
        if simulated_fail_tool and simulated_fail_tool in (tool.name, tool_name, *tool.aliases):
            return {
                "tool": tool.name,
                "status": "ERROR",
                "error": f"Simulated transient failure in {tool.name}",
                "data_source": tool.data_source,
            }
        return await tool.execute(db, self, farmer_id=int(farmer_id), field_id=int(field_id), **kwargs)

    def set_sensor_offline(self, farmer_id: int, offline: bool) -> None:
        self._sensor_override_offline[int(farmer_id)] = bool(offline)

    def is_sensor_offline(self, farmer_id: int) -> bool:
        return bool(self._sensor_override_offline.get(int(farmer_id), False))

    def set_weather_offline(self, farmer_id: int, offline: bool) -> None:
        self._weather_override_offline[int(farmer_id)] = bool(offline)

    def is_weather_offline(self, farmer_id: int) -> bool:
        return bool(self._weather_override_offline.get(int(farmer_id), False))

    def set_availability(
        self,
        farmer_id: int,
        *,
        drone_available: Optional[bool] = None,
        rover_available: Optional[bool] = None,
        sensor_offline: Optional[bool] = None,
        weather_offline: Optional[bool] = None,
    ) -> Dict[str, Any]:
        fid = int(farmer_id)
        if drone_available is not None:
            self._drone_override_unavailable[fid] = not bool(drone_available)
        if rover_available is not None:
            self._rover_override_unavailable[fid] = not bool(rover_available)
        if sensor_offline is not None:
            self._sensor_override_offline[fid] = bool(sensor_offline)
        if weather_offline is not None:
            self._weather_override_offline[fid] = bool(weather_offline)
        return self.check_availability(fid)

    def check_availability(self, farmer_id: int) -> Dict[str, Any]:
        fid = int(farmer_id)
        meta = get_farmer_meta(fid)
        rain_prob = int(meta.get("default_precip_prob", 5))

        default_drone_ok = rain_prob < 50
        default_rover_ok = rain_prob < 50 and fid in (1, 2, 5)

        drone_ok = (
            not self._drone_override_unavailable[fid]
            if fid in self._drone_override_unavailable
            else default_drone_ok
        )
        rover_ok = (
            not self._rover_override_unavailable[fid]
            if fid in self._rover_override_unavailable
            else default_rover_ok
        )

        return {
            "farmer_id": fid,
            "village": meta["village"],
            "drone_available": drone_ok,
            "drone_unit": "UAV-ALPHA (SIMULATED DRONE)",
            "drone_reason": (
                "SIMULATED DRONE UAV-ALPHA ready on standby"
                if drone_ok
                else f"UAV-ALPHA unavailable (Weather/Sector Hold · Rain {rain_prob}%) -> Fallback to FarmerTaskTool"
            ),
            "rover_available": rover_ok,
            "rover_unit": "UGV-ROVER-02 (SIMULATED ROVER)" if fid == 2 else "UGV-ROVER-01 (SIMULATED ROVER)",
            "rover_reason": (
                "SIMULATED ROVER available in sector"
                if rover_ok
                else f"UGV Rover unavailable in {meta['village']} sector -> Fallback to FarmerTaskTool"
            ),
            "esp32_sensor_offline": self.is_sensor_offline(fid),
            "weather_api_offline": self.is_weather_offline(fid),
            "capabilities": [
                {
                    **c,
                    "available": (
                        drone_ok
                        if c["name"] == "DroneTool"
                        else (rover_ok if c["name"] == "GroundRobotTool" else True)
                    ),
                }
                for c in self.CAPABILITY_CATALOG
            ],
        }

    def execute_capability_request(
        self,
        db: Session,
        *,
        farmer_id: int,
        field_id: int = 1,
        goal: str = "CROP_STRESS_SURVEY",
        preferred_tool: str = "DroneTool",
    ) -> Dict[str, Any]:
        """Executes a capability request via FarmManager:
        - Checks if preferred_tool (DroneTool or GroundRobotTool) is available.
        - If available -> creates a SIMULATED RobotMission with full state progression.
        - If unavailable -> automatically falls back to FarmerTaskTool and creates a persistent manual Task.
        """
        avail = self.check_availability(farmer_id)
        meta = get_farmer_meta(farmer_id)
        now = utcnow()

        if preferred_tool in ("DroneTool", "create_drone_mission", "drone_inspection"):
            if avail["drone_available"]:
                code = f"DRN-SIM-{uuid.uuid4().hex[:6].upper()}"
                mission = RobotMission(
                    mission_code=code,
                    farmer_id=farmer_id,
                    farm_id=farmer_id,
                    field_id=field_id,
                    unit_id="UAV-ALPHA",
                    robot_type="SIMULATED_DRONE",
                    mission_type=goal,
                    state="SURVEYING",
                    state_history=[
                        "MISSION_CREATED",
                        "PLANNED",
                        "TAKEOFF",
                        "SURVEYING",
                    ],
                    battery_pct=91,
                    progress_pct=55,
                    images_captured=12,
                    findings=(
                        f"SIMULATED DRONE mission {code} active over Field #{field_id} ({meta['village']}): "
                        f"Capturing multispectral canopy frames for {meta['crop_variety']}."
                    ),
                    is_simulated=True,
                    data_source="SIMULATED DRONE",
                    created_at=now,
                    updated_at=now,
                )
                db.add(mission)
                db.add(
                    Notification(
                        farmer_id=farmer_id,
                        farm_id=farmer_id,
                        category="DRONE_MISSION",
                        severity="INFO",
                        title=f"SIMULATED DRONE Mission {code} Dispatched",
                        title_te=f"సిమ్యులేటెడ్ డ్రోన్ మిషన్ ({code}) ప్రారంభించబడింది",
                        title_hi=f"सिम्युलेटेड ड्रोन मिशन ({code}) शुरू किया गया",
                        message=mission.findings,
                        message_te=f"{meta['village_te']} పొలంలో సిమ్యులేటెడ్ డ్రోన్ పంట పరిశీలన చేస్తోంది.",
                        message_hi=f"{meta['village_hi']} खेत में सिम्युलेटेड ड्रोन सर्वेक्षण कर रहा है।",
                        data_source="SIMULATED DRONE",
                        created_at=now,
                    )
                )
                db.commit()
                db.refresh(mission)
                return {
                    "selected_tool": "DroneTool",
                    "tool_used": "DroneTool",
                    "mission_code": code,
                    "source_label": "SIMULATED DRONE",
                    "fallback_used": False,
                    "data_source": "SIMULATED DRONE",
                    "reason": avail["drone_reason"],
                    "mission": self.serialize_mission(mission),
                    "task": None,
                }
            else:
                task = Task(
                    farmer_id=farmer_id,
                    farm_id=farmer_id,
                    field_id=field_id,
                    title=f"Manual Field Walk: Check Field #{field_id} for Crop Stress ({meta['crop_variety']})",
                    title_te=f"మాన్యువల్ పొలం పరిశీలన: పొలం #{field_id} లో పంట ఒత్తిడిని తనిఖీ చేయండి",
                    title_hi=f"मैनुअल खेत निरीक्षण: खेत #{field_id} में फसल तनाव की जांच करें",
                    description=f"Drone unavailable ({avail['drone_reason']}). Created by FarmerTaskTool fallback.",
                    category="FIELD_INSPECTION",
                    priority="HIGH",
                    status="TODO",
                    assigned_tool="FarmerTaskTool",
                    source_agent="farm_manager_agent",
                    due_date="Today",
                    created_at=now,
                )
                db.add(task)
                db.commit()
                db.refresh(task)
                return {
                    "selected_tool": "FarmerTaskTool",
                    "tool_used": "FarmerTaskTool",
                    "source_label": "AI ESTIMATE",
                    "fallback_used": True,
                    "data_source": "AI ESTIMATE",
                    "reason": avail["drone_reason"],
                    "mission": None,
                    "task": self.serialize_task(task),
                }

        if preferred_tool in ("GroundRobotTool", "RoverTool", "create_rover_mission", "rover_soil_sample"):
            if avail["rover_available"]:
                code = f"RVR-SIM-{uuid.uuid4().hex[:6].upper()}"
                mission = RobotMission(
                    mission_code=code,
                    farmer_id=farmer_id,
                    farm_id=farmer_id,
                    field_id=field_id,
                    unit_id="UGV-ROVER-02" if farmer_id == 2 else "UGV-ROVER-01",
                    robot_type="SIMULATED_ROVER",
                    mission_type=goal,
                    state="SURVEYING",
                    state_history=[
                        "MISSION_CREATED",
                        "PLANNED",
                        "SURVEYING",
                    ],
                    battery_pct=84,
                    progress_pct=45,
                    images_captured=8,
                    findings=(
                        f"SIMULATED ROVER mission {code} active in Field #{field_id} ({meta['village']}): "
                        f"Collecting proximal root-zone soil & pest observations for {meta['crop_variety']}."
                    ),
                    is_simulated=True,
                    data_source="SIMULATED ROVER",
                    created_at=now,
                    updated_at=now,
                )
                db.add(mission)
                db.add(
                    Notification(
                        farmer_id=farmer_id,
                        farm_id=farmer_id,
                        category="ROVER_MISSION",
                        severity="INFO",
                        title=f"SIMULATED ROVER Mission {code} Dispatched",
                        title_te=f"సిమ్యులేటెడ్ రోవర్ మిషన్ ({code}) ప్రారంభించబడింది",
                        title_hi=f"सिम्युलेटेड रोवर मिशन ({code}) शुरू किया गया",
                        message=mission.findings,
                        message_te=f"{meta['village_te']} పొలంలో సిమ్యులేటెడ్ రోవర్ మట్టి నమూనా పరిశీలన చేస్తోంది.",
                        message_hi=f"{meta['village_hi']} खेत में सिम्युलेटेड रोवर मिट्टी परीक्षण कर रहा है।",
                        data_source="SIMULATED ROVER",
                        created_at=now,
                    )
                )
                db.commit()
                db.refresh(mission)
                return {
                    "selected_tool": "GroundRobotTool",
                    "tool_used": "GroundRobotTool",
                    "mission_code": code,
                    "source_label": "SIMULATED ROVER",
                    "fallback_used": False,
                    "data_source": "SIMULATED ROVER",
                    "reason": avail["rover_reason"],
                    "mission": self.serialize_mission(mission),
                    "task": None,
                }
            else:
                task = Task(
                    farmer_id=farmer_id,
                    farm_id=farmer_id,
                    field_id=field_id,
                    title=f"Collect Soil Sample Manually from Field #{field_id} ({meta['village']})",
                    title_te=f"పొలం #{field_id} ({meta['village_te']}) నుండి మట్టి నమూనాను స్వయంగా సేకరించండి",
                    title_hi=f"खेत #{field_id} ({meta['village_hi']}) से मिट्टी का नमूना मैनुअल रूप से एकत्र करें",
                    description=f"Ground Rover unavailable ({avail['rover_reason']}). Created by FarmerTaskTool fallback.",
                    category="SOIL_SAMPLING",
                    priority="MEDIUM",
                    status="TODO",
                    assigned_tool="FarmerTaskTool",
                    source_agent="farm_manager_agent",
                    due_date="Today",
                    created_at=now,
                )
                db.add(task)
                db.commit()
                db.refresh(task)
                return {
                    "selected_tool": "FarmerTaskTool",
                    "tool_used": "FarmerTaskTool",
                    "source_label": "AI ESTIMATE",
                    "fallback_used": True,
                    "data_source": "AI ESTIMATE",
                    "reason": avail["rover_reason"],
                    "mission": None,
                    "task": self.serialize_task(task),
                }

        # Default: FarmerTaskTool
        task = Task(
            farmer_id=farmer_id,
            farm_id=farmer_id,
            field_id=field_id,
            title=goal,
            title_te=goal,
            title_hi=goal,
            description="Created via FarmerTaskTool.",
            category="GENERAL",
            priority="MEDIUM",
            status="TODO",
            assigned_tool="FarmerTaskTool",
            source_agent="farm_manager_agent",
            due_date="Today",
            created_at=now,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return {
            "selected_tool": "FarmerTaskTool",
            "tool_used": "FarmerTaskTool",
            "source_label": "AI ESTIMATE",
            "fallback_used": False,
            "data_source": "AI ESTIMATE",
            "reason": "Direct FarmerTaskTool assignment",
            "mission": None,
            "task": self.serialize_task(task),
        }

    def advance_mission_state(self, db: Session, mission_id: int) -> Optional[Dict[str, Any]]:
        mission = db.get(RobotMission, mission_id)
        if mission is None:
            return None
        order = [
            "MISSION_CREATED",
            "PLANNED",
            "TAKEOFF",
            "SURVEYING",
            "IMAGE_CAPTURE",
            "ANALYZING",
            "RETURNING",
            "COMPLETED",
        ]
        if mission.robot_type == "SIMULATED_ROVER":
            order = [s for s in order if s != "TAKEOFF"]

        try:
            idx = order.index(mission.state)
            next_state = order[min(len(order) - 1, idx + 1)]
        except ValueError:
            next_state = "COMPLETED"

        mission.state = next_state
        hist = list(mission.state_history or [])
        if next_state not in hist:
            hist.append(next_state)
        mission.state_history = hist
        mission.progress_pct = int(round(((order.index(next_state) + 1) / len(order)) * 100))
        mission.images_captured = int(mission.images_captured or 0) + (
            6 if next_state in ("SURVEYING", "IMAGE_CAPTURE") else 0
        )
        mission.battery_pct = max(45, int(mission.battery_pct or 90) - 3)
        if next_state == "COMPLETED":
            mission.findings = (
                f"{mission.data_source} mission {mission.mission_code} COMPLETED: "
                f"{mission.images_captured} frames analyzed. Localized moisture/canopy map updated."
            )
        mission.updated_at = utcnow()
        db.commit()
        db.refresh(mission)
        return self.serialize_mission(mission)

    @staticmethod
    def serialize_mission(m: RobotMission) -> Dict[str, Any]:
        return {
            "id": m.id,
            "mission_code": m.mission_code,
            "farmer_id": m.farmer_id,
            "farm_id": m.farm_id,
            "field_id": m.field_id,
            "unit_id": m.unit_id,
            "robot_type": "DRONE" if "DRONE" in m.robot_type else "ROVER",
            "robot_type_full": m.robot_type,
            "mission_type": m.mission_type,
            "state": m.state,
            "state_history": list(m.state_history or []),
            "all_states": DRONE_MISSION_STATES,
            "battery_pct": m.battery_pct,
            "battery_percent": m.battery_pct,
            "progress_pct": m.progress_pct,
            "progress_percent": m.progress_pct,
            "images_captured": m.images_captured,
            "findings": m.findings,
            "findings_summary": m.findings,
            "is_simulated": True,
            "simulated_badge": "SIMULATED DRONE" if "DRONE" in m.robot_type else "SIMULATED ROVER",
            "source_label": "SIMULATED DRONE" if "DRONE" in m.robot_type else "SIMULATED ROVER",
            "data_source": m.data_source,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }

    @staticmethod
    def serialize_task(t: Task) -> Dict[str, Any]:
        return {
            "id": t.id,
            "farmer_id": t.farmer_id,
            "farm_id": t.farm_id,
            "field_id": t.field_id,
            "title": t.title,
            "title_te": t.title_te or t.title,
            "title_hi": t.title_hi or t.title,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "assigned_tool": t.assigned_tool,
            "source_agent": t.source_agent,
            "due_date": t.due_date,
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        }


capability_registry = CapabilityRegistry()
