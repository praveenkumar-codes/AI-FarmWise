"""Allow `python -m uvicorn server.app.main:app` from workspace root by aliasing `app.*` to `server.app.*`."""
from __future__ import annotations

import sys
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parent
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))
