"""Standardised output returned by every agent."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal

AgentStatusLiteral = Literal["OK", "NOT_IMPLEMENTED", "SKIPPED", "ERROR"]


@dataclass
class ProposedActionDraft:
    """Structured recommendation produced by a domain agent before persistence."""

    type: str
    title: str
    why: str
    evidence: List[str]
    missing_data: List[str]
    target: str = "zone_01"
    confidence: float = 0.85
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    agent_name: str
    status: AgentStatusLiteral = "OK"
    summary: str = ""
    findings: Dict[str, Any] = field(default_factory=dict)
    evidence: List[str] = field(default_factory=list)
    missing_data: List[str] = field(default_factory=list)
    proposals: List[ProposedActionDraft] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "summary": self.summary,
            "findings": self.findings,
            "evidence": self.evidence,
            "missing_data": self.missing_data,
            "proposal_count": len(self.proposals),
        }
