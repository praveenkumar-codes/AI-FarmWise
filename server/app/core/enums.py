"""Shared enumerations for the action lifecycle."""
from __future__ import annotations

from enum import Enum


class ActionStatus(str, Enum):
    """Human-in-the-loop decision state. Only PENDING_APPROVAL is mutable."""

    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ExecutionStatus(str, Enum):
    """Physical execution state, tracked separately from the human decision."""

    NOT_DISPATCHED = "NOT_DISPATCHED"
    DISPATCHED = "DISPATCHED"
    BLOCKED = "BLOCKED"  # safety interlock refused dispatch
    ABORTED = "ABORTED"  # emergency stop cancelled an in-flight execution
    FAILED = "FAILED"


class ActionType(str, Enum):
    IRRIGATION_DISPATCH = "IRRIGATION_DISPATCH"
