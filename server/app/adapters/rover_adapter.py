"""Ground Rover Adapter (Placeholder for future UGV actuation)."""
from __future__ import annotations

from typing import Any, Dict


class RoverAdapter:
    """Placeholder adapter for ROS2 / ground rover navigation and soil sampling."""

    def dispatch_mission(self, *, zone: str, task: str) -> Dict[str, Any]:
        # TODO(phase-2): Connect to ROS2 bridge / MQTT topic for rover waypoint dispatch.
        return {
            "status": "NOT_IMPLEMENTED",
            "zone": zone,
            "task": task,
            "message": "Rover adapter is a placeholder for future multi-agent expansion.",
        }


rover_adapter = RoverAdapter()
