"""API v1 router aggregating telemetry, dashboard, approvals, devices, assistant, multi-farmer, and platform endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import approvals, assistant, dashboard, devices, farmers, platform, reports, telemetry

api_router = APIRouter()
api_router.include_router(telemetry.router, tags=["telemetry"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(approvals.router, tags=["approvals"])
api_router.include_router(devices.router, tags=["devices"])
api_router.include_router(assistant.router, tags=["assistant"])
api_router.include_router(farmers.router, tags=["farmers"])
api_router.include_router(platform.router, tags=["platform"])
api_router.include_router(reports.router, tags=["reports"])

