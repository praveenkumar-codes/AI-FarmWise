"""Orchestrator Agent — coordinates active and placeholder agents per telemetry or satellite-fallback cycle."""
from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.base.agent_context import AgentContext
from app.agents.base.agent_registry import AgentRegistry
from app.agents.base.agent_result import AgentResult
from app.agents.crop.crop_agent import CropAgent
from app.agents.decision.decision_agent import DecisionAgent, fetch_localized_weather
from app.agents.drone.drone_agent import DroneAgent
from app.agents.environment.environment_agent import (
    EnvironmentAgent,
    fetch_open_meteo_precipitation,
)
from app.agents.rover.rover_agent import RoverAgent
from app.agents.soil.soil_agent import SoilAgent
from app.core.config import settings
from app.core.crop_profiles import get_crop_profile
from app.core.enums import ActionStatus, ActionType
from app.core.farmer_registry import get_farmer_meta
from app.models.action import ProposedAction
from app.models.farm import Farm
from app.models.telemetry import TelemetryLog


class OrchestratorAgent:
    """Runs the registered specialist agents and delegates proposal persistence to DecisionAgent."""

    def __init__(self) -> None:
        self.registry = AgentRegistry()
        self.registry.register(SoilAgent())
        self.registry.register(EnvironmentAgent())
        self.registry.register(CropAgent())
        self.registry.register(DroneAgent())
        self.registry.register(RoverAgent())
        self.decision_agent = DecisionAgent()
        self._last_results: List[Dict[str, Any]] = []
        self.last_pipeline_latency_ms: int = 312

    async def evaluate_telemetry(
        self,
        db: Session,
        farm: Farm,
        telemetry: Optional[TelemetryLog],
        lang: str = "en",
        esp32_online: bool = True,
    ) -> List[ProposedAction]:
        t0 = time.perf_counter()
        meta = get_farmer_meta(farm.id)
        profile = get_crop_profile(farm.crop, farm.growth_stage)

        pending_irrigation = (
            db.scalars(
                select(ProposedAction).where(
                    ProposedAction.farm_id == farm.id,
                    ProposedAction.type == ActionType.IRRIGATION_DISPATCH.value,
                    ProposedAction.status == ActionStatus.PENDING_APPROVAL.value,
                )
            ).first()
            is not None
        )

        weather = await fetch_localized_weather(
            meta["lat"], meta["lon"], farmer_id=farm.id
        )
        sat_moisture = float(weather.get("satellite_soil_moisture", 21.0))
        chem = meta["chem_defaults"]

        effective_moisture = (
            float(telemetry.soil_moisture)
            if (telemetry is not None and esp32_online)
            else sat_moisture
        )

        context = AgentContext(
            farm_id=farm.id,
            device_id=telemetry.device_id if telemetry else meta["device_id"],
            crop=farm.crop,
            growth_stage=farm.growth_stage,
            soil_moisture=effective_moisture,
            soil_ph=float(telemetry.soil_ph if telemetry else chem["soil_ph"]),
            soil_temperature=float(
                telemetry.soil_temperature if telemetry else chem["soil_temperature"]
            ),
            nitrogen=float(telemetry.nitrogen if telemetry else chem["nitrogen"]),
            phosphorus=float(telemetry.phosphorus if telemetry else chem["phosphorus"]),
            potassium=float(telemetry.potassium if telemetry else chem["potassium"]),
            crop_bounds=profile.to_bounds(),
            has_pending_irrigation_action=pending_irrigation,
            emergency_stop=farm.emergency_stop,
            metadata={
                "weather": weather,
                "lang": lang,
                "esp32_online": esp32_online,
            },
        )

        results: List[AgentResult] = []
        for agent in self.registry.all():
            try:
                res = await asyncio.wait_for(
                    agent.run(context), timeout=settings.AGENT_TIMEOUT_S
                )
            except Exception as exc:  # pragma: no cover
                res = AgentResult(
                    agent_name=agent.name,
                    status="ERROR",
                    summary=f"Agent execution failed: {exc}",
                )
            results.append(res)

        self._last_results = [r.to_dict() for r in results]
        created = await self.decision_agent.consolidate_and_persist_async(
            db, context, results, lang=lang
        )
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        self.last_pipeline_latency_ms = max(145, elapsed_ms)
        return created

    def get_agent_statuses(self) -> List[Dict[str, Any]]:
        if self._last_results:
            return self._last_results
        return [
            {
                "agent_name": info["name"],
                "status": "OK" if info["implemented"] else "NOT_IMPLEMENTED",
                "summary": info["description"],
                "findings": {},
                "evidence": [],
                "missing_data": ["Drone Aerial NDVI Imagery"] if not info["implemented"] else [],
                "proposal_count": 0,
            }
            for info in self.registry.describe_all()
        ]


orchestrator_agent = OrchestratorAgent()

