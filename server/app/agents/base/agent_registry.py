"""Registry for discovering and inspecting registered domain agents."""
from __future__ import annotations

from typing import Dict, List

from app.agents.base.agent_interface import BaseAgent


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: Dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent) -> None:
        self._agents[agent.name] = agent

    def get(self, name: str) -> BaseAgent:
        return self._agents[name]

    def all(self) -> List[BaseAgent]:
        return list(self._agents.values())

    def describe_all(self) -> List[dict]:
        return [
            {
                "name": agent.name,
                "description": agent.description,
                "implemented": getattr(agent, "implemented", True),
            }
            for agent in self._agents.values()
        ]
