"""Telemetry Ingestion & Microclimate Synthesis Endpoint (`POST /api/v1/telemetry`)."""
from __future__ import annotations

import random
from typing import Dict
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.decision.decision_agent import build_local_fallback_rationale
from app.agents.orchestrator.orchestrator_agent import orchestrator_agent
from app.core.config import settings
from app.core.timeutils import iso, utcnow
from app.database import get_db
from app.models.device import Device
from app.models.farm import Farm
from app.models.telemetry import TelemetryLog
from app.schemas import ActionOut, TelemetryIn, TelemetryOut

router = APIRouter()


def _clamp_walk(prev: float | None, low: float, high: float, step: float, decimals: int = 1) -> float:
    if prev is None:
        val = random.uniform(low, high)
    else:
        val = prev + random.uniform(-step, step)
        val = max(low, min(high, val))
    return round(val, decimals)


def synthesize_microclimate(prev: TelemetryLog | None) -> Dict[str, float]:
    """Generate realistic, gently fluctuating root-zone chemistry within exact specification bounds:
    - soil_ph: 6.4 to 7.1
    - soil_temperature: 25.5°C to 29.5°C
    - nitrogen: 28.0 to 36.0 mg/kg
    - phosphorus: 16.0 to 24.0 mg/kg
    - potassium: 170.0 to 205.0 mg/kg
    """
    return {
        "soil_ph": _clamp_walk(prev.soil_ph if prev else None, 6.4, 7.1, 0.05, 2),
        "soil_temperature": _clamp_walk(prev.soil_temperature if prev else None, 25.5, 29.5, 0.25, 1),
        "nitrogen": _clamp_walk(prev.nitrogen if prev else None, 28.0, 36.0, 0.6, 1),
        "phosphorus": _clamp_walk(prev.phosphorus if prev else None, 16.0, 24.0, 0.5, 1),
        "potassium": _clamp_walk(prev.potassium if prev else None, 170.0, 205.0, 2.0, 1),
    }


def serialize_telemetry(row: TelemetryLog) -> TelemetryOut:
    return TelemetryOut(
        id=row.id,
        device_id=row.device_id,
        soil_moisture=round(float(row.soil_moisture), 1),
        soil_ph=round(float(row.soil_ph), 2),
        soil_temperature=round(float(row.soil_temperature), 1),
        nitrogen=round(float(row.nitrogen), 1),
        phosphorus=round(float(row.phosphorus), 1),
        potassium=round(float(row.potassium), 1),
        synthesized_fields=list(row.synthesized_fields or []),
        timestamp=iso(row.created_at) or "",
    )


def serialize_action(
    action,
    lang: str = "en",
    latest_telemetry: TelemetryLog | None = None,
) -> ActionOut:
    params = dict(action.parameters or {})
    i18n_map = params.get("i18n") or {}
    lang_code = lang if lang in ("en", "te", "hi") else "en"

    title = action.title
    why = action.why
    evidence = list(action.evidence or [])
    missing_data = list(action.missing_data or [])

    if lang_code != "en":
        localized = i18n_map.get(lang_code)
        if not localized:
            moisture = float(
                params.get("moisture")
                or (latest_telemetry.soil_moisture if latest_telemetry else 18.5)
            )
            localized = build_local_fallback_rationale(
                moisture=moisture,
                soil_ph=latest_telemetry.soil_ph if latest_telemetry else 6.8,
                soil_temp=latest_telemetry.soil_temperature if latest_telemetry else 27.5,
                nitrogen=latest_telemetry.nitrogen if latest_telemetry else 32.0,
                phosphorus=latest_telemetry.phosphorus if latest_telemetry else 20.0,
                potassium=latest_telemetry.potassium if latest_telemetry else 185.0,
                precip_prob=int(params.get("precip_prob", 5)),
                lang=lang_code,
            )
        title = localized.get("action_title") or title
        why = localized.get("why") or why
        evidence = list(localized.get("evidence") or evidence)
        missing_data = list(localized.get("missing_data") or missing_data)

    return ActionOut(
        id=action.id,
        type=action.type,
        title=title,
        why=why,
        evidence=evidence,
        missing_data=missing_data,
        status=action.status,
        agent=action.agent,
        target=action.target,
        confidence=action.confidence,
        execution_status=action.execution_status,
        execution_ref=action.execution_ref,
        decided_by=action.decided_by,
        decided_at=iso(action.decided_at),
        decision_note=action.decision_note,
        created_at=iso(action.created_at),
    )


@router.post("/telemetry")
async def ingest_telemetry(
    payload: TelemetryIn,
    request: Request,
    db: Session = Depends(get_db),
):
    farm = db.get(Farm, settings.DEFAULT_FARM_ID)
    if farm is None:
        farm = Farm(
            id=settings.DEFAULT_FARM_ID,
            name="FarmWise Demo Farm",
            location="Guntur, Andhra Pradesh",
            crop="Rice",
            growth_stage="Vegetative",
        )
        db.add(farm)
        db.flush()

    now = utcnow()
    device = db.get(Device, payload.device_id)
    if device is None:
        device = Device(
            id=payload.device_id,
            farm_id=farm.id,
            zone="zone_01",
            kind="ESP32_SOIL_NODE",
        )
        db.add(device)
    device.last_seen = now
    device.last_ip = request.client.host if request.client else "127.0.0.1"

    prev_telemetry = db.scalars(
        select(TelemetryLog)
        .where(TelemetryLog.device_id == payload.device_id)
        .order_by(TelemetryLog.id.desc())
        .limit(1)
    ).first()

    synth = synthesize_microclimate(prev_telemetry)
    exact_moisture = round(float(payload.soil_moisture), 2)

    telemetry_row = TelemetryLog(
        farm_id=farm.id,
        device_id=payload.device_id,
        soil_moisture=exact_moisture,
        soil_ph=synth["soil_ph"],
        soil_temperature=synth["soil_temperature"],
        nitrogen=synth["nitrogen"],
        phosphorus=synth["phosphorus"],
        potassium=synth["potassium"],
        synthesized_fields=[
            "soil_ph",
            "soil_temperature",
            "nitrogen",
            "phosphorus",
            "potassium",
        ],
        created_at=now,
    )
    db.add(telemetry_row)
    db.flush()

    new_actions = await orchestrator_agent.evaluate_telemetry(db, farm, telemetry_row)
    db.commit()
    db.refresh(telemetry_row)

    return {
        "status": "ok",
        "telemetry": serialize_telemetry(telemetry_row),
        "generated_actions": [serialize_action(a, lang="en", latest_telemetry=telemetry_row) for a in new_actions],
    }
