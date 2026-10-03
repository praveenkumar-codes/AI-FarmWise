"""Placeholder Drone Aerial Imagery (NDVI / Multispectral) Agent."""
from __future__ import annotations

from app.agents.base.agent_context import AgentContext
from app.agents.base.agent_interface import BaseAgent
from app.agents.base.agent_result import AgentResult


class DroneAgent(BaseAgent):
    name = "drone_agent"
    description = "Placeholder: UAV multispectral NDVI canopy stress & thermal anomaly detector."
    implemented = False

    async def run(self, context: AgentContext) -> AgentResult:
        # TODO(phase-2): Ingest GeoTIFF orthomosaics from UAV flights to compute zonal NDVI stress maps.
        return AgentResult(
            agent_name=self.name,
            status="NOT_IMPLEMENTED",
            summary="TODO: Connect UAV multispectral NDVI tiling pipeline.",
            missing_data=["Drone Aerial NDVI Imagery"],
        )
