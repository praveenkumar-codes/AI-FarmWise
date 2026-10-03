"""Placeholder Crop Phenology & Nutrient Agent for future multi-agent expansion."""
from __future__ import annotations

from app.agents.base.agent_context import AgentContext
from app.agents.base.agent_interface import BaseAgent
from app.agents.base.agent_result import AgentResult


class CropAgent(BaseAgent):
    name = "crop_agent"
    description = "Placeholder: Crop growth-stage phenology & NPK fertigation advisor."
    implemented = False

    async def run(self, context: AgentContext) -> AgentResult:
        # TODO(phase-2): Plug in LangGraph agronomic RAG node for stage-specific NPK fertigation scheduling.
        return AgentResult(
            agent_name=self.name,
            status="NOT_IMPLEMENTED",
            summary="TODO: Implement crop phenology & foliar/fertigation diagnostic node.",
            missing_data=["Leaf Chlorophyll SPAD Meter"],
        )
