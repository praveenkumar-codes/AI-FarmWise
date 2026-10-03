"""Time helpers. All timestamps are stored as naive UTC and serialised with an explicit offset."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def utcnow() -> datetime:
    """Naive UTC 'now' (SQLite does not preserve tzinfo)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt: Optional[datetime]) -> Optional[str]:
    """Serialise a (naive-UTC or aware) datetime as ISO-8601 with a UTC offset."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()
