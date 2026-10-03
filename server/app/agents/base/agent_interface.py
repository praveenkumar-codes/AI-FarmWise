"""Abstract BaseAgent contract for all AI FarmWise domain agents."""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.agents.base.agent_context import AgentContext
from app.agents.base.agent_result import AgentResult


class BaseAgent(ABC):
    """Base contract that every specialist agent (Soil, Environment, Crop, Drone, Rover) must implement."""

    name: str = "base_agent"
    description: str = "Abstract FarmWise agent"
    implemented: bool = True

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        """Evaluate the current AgentContext and return an AgentResult."""
        raise NotImplementedError
