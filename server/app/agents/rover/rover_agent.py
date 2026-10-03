"""Placeholder Ground Rover Scouting Agent."""
from __future__ import annotations

from app.agents.base.agent_context import AgentContext
from app.agents.base.agent_interface import BaseAgent
from app.agents.base.agent_result import AgentResult


class RoverAgent(BaseAgent):
    name = "rover_agent"
    description = "Placeholder: UGV proximal weed/pest scouting & physical soil sampling agent."
    implemented = False

    async def run(self, context: AgentContext) -> AgentResult:
        # TODO(phase-2): Connect ROS2 Nav2 waypoint planner and proximal vision pest classifier.
        return AgentResult(
            agent_name=self.name,
            status="NOT_IMPLEMENTED",
            summary="TODO: Implement UGV rover scouting mission planner.",
            missing_data=["Rover Proximal Stem Imagery"],
        )
