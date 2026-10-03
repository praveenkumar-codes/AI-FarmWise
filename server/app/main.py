"""FastAPI entrypoint for AI FarmWise with multi-origin CORS for Ports 5173, 5174, and 8000."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.database import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Human-in-the-Loop Agentic AI Farm Decision Support Platform — "
        "connecting physical ESP32 soil telemetry, ECMWF Satellite Soil Moisture Fusion, "
        "Multi-Farmer Fleet Orchestration, and a safety-interlocked Approval Gateway."
    ),
    lifespan=lifespan,
)

# Task 1.1: Enable unrestricted CORS for http://localhost:5173, http://localhost:5174,
# http://127.0.0.1:5173, http://127.0.0.1:5174, and all local network IPs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/ui/")


CLIENT_DIR = Path(__file__).resolve().parents[2] / "client"
FARMER_APP_DIR = CLIENT_DIR / "farmer-app"
ADMIN_APP_DIR = CLIENT_DIR / "admin-dashboard"

if FARMER_APP_DIR.exists():
    app.mount("/farmer", StaticFiles(directory=str(FARMER_APP_DIR), html=True), name="farmer_app_ui")

if ADMIN_APP_DIR.exists():
    app.mount("/admin", StaticFiles(directory=str(ADMIN_APP_DIR), html=True), name="admin_app_ui")

if CLIENT_DIR.exists():
    app.mount("/ui", StaticFiles(directory=str(CLIENT_DIR), html=True), name="client_ui")
