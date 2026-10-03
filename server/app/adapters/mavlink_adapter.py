"""MAVLink / Irrigation Valve Hardware Adapter (Simulated with Safety Interlock)."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger("farmwise.mavlink")


class SafetyInterlockError(RuntimeError):
    """Raised when physical dispatch is blocked by an active safety interlock."""


class MavlinkAdapter:
    """Simulates MAVLink / actuator command dispatch for irrigation valves & drones."""

    def __init__(self) -> None:
        self._active_missions: Dict[str, Dict[str, Any]] = {}

    def dispatch_irrigation(
        self,
        *,
        action_id: str,
        zone: str,
        depth_mm: float = 15.0,
        emergency_stop_active: bool = False,
    ) -> Dict[str, Any]:
        if emergency_stop_active:
            logger.warning(
                "SAFETY INTERLOCK: Blocked MAVLink dispatch for %s (Emergency Stop Active)",
                action_id,
            )
            raise SafetyInterlockError("Emergency Stop is active. All physical dispatches are locked out.")

        dispatch_ref = f"MAV-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "dispatch_ref": dispatch_ref,
            "protocol": "MAVLINK_V2_SIM",
            "command": "MAV_CMD_DO_SET_ACTUATOR",
            "action_id": action_id,
            "target_zone": zone,
            "depth_mm": depth_mm,
            "dispatched_at": datetime.now(timezone.utc).isoformat(),
            "status": "DISPATCHED",
        }
        self._active_missions[dispatch_ref] = payload
        logger.info("MAVLink command dispatched: %s", payload)
        return payload

    def abort_all(self) -> int:
        count = len(self._active_missions)
        for ref, mission in self._active_missions.items():
            mission["status"] = "ABORTED"
            logger.warning("Aborted active mission %s due to Emergency Stop", ref)
        self._active_missions.clear()
        return count


mavlink_adapter = MavlinkAdapter()
