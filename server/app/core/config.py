"""Centralised runtime configuration (environment-overridable)."""
from __future__ import annotations

import os


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


class Settings:
    APP_NAME: str = "AI FarmWise"
    APP_VERSION: str = "0.1.0"
    API_PREFIX: str = "/api/v1"

    # Single-farm vertical slice: every device is attached to this farm by default.
    DEFAULT_FARM_ID: int = 1
    DEFAULT_DEVICE_ID: str = "esp32_zone_01"

    # A device is considered online if it posted within this many seconds.
    # ESP32 transmits every 3 s, so 15 s tolerates ~4 missed packets.
    DEVICE_ONLINE_TIMEOUT_S: float = _float_env("FARMWISE_DEVICE_TIMEOUT_S", 15.0)

    # After a human approves/rejects an action, the same action type for the
    # same target is not re-proposed for this many minutes (prevents the
    # 3-second telemetry loop from spamming the farmer while water soaks in).
    ACTION_COOLDOWN_MINUTES: float = _float_env("FARMWISE_ACTION_COOLDOWN_MIN", 10.0)

    # Per-agent timeout inside the orchestrator.
    AGENT_TIMEOUT_S: float = _float_env("FARMWISE_AGENT_TIMEOUT_S", 5.0)

    DASHBOARD_HISTORY_POINTS: int = 60
    DASHBOARD_ACTION_LIMIT: int = 25


settings = Settings()
