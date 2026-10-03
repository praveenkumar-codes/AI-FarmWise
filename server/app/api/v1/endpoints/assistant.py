"""AI Agronomist Conversational Assistant Endpoint (`POST /api/v1/assistant/chat`)."""
from __future__ import annotations

import os
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.environment.environment_agent import fetch_open_meteo_precipitation
from app.core.config import settings
from app.core.enums import ActionStatus
from app.database import get_db
from app.models.action import ProposedAction
from app.models.farm import Farm
from app.models.telemetry import TelemetryLog
from app.schemas import AssistantChatIn, AssistantChatOut

router = APIRouter()


def _build_grounded_fallback_reply(
    *,
    message: str,
    lang: str,
    moisture: float,
    soil_temp: float,
    soil_ph: float,
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    precip_prob: int,
    pending_count: int,
    pending_id: str | None,
) -> str:
    m = round(float(moisture), 1)
    t = round(float(soil_temp), 1)
    ph = round(float(soil_ph), 2)
    needs_water = m < 30.0

    if lang == "te":
        if needs_water:
            return (
                f"అవును, ఈ రోజు తప్పనిసరిగా నీరు పెట్టాలి. ప్రస్తుతం ESP32 సెన్సార్ (GPIO 34) ప్రకారం నేల తేమ {m}% మాత్రమే ఉంది, "
                f"ఇది వరి (Vegetative దశ) కనిష్ట పరిమితి 30.0% కంటే తక్కువ. నేల ఉష్ణోగ్రత {t}°C (pH {ph}, NPK {nitrogen:.1f}/{phosphorus:.1f}/{potassium:.1f} mg/kg) "
                f"మరియు రాబోయే 6 గంటల్లో వర్ష సంభావ్యత {precip_prob}% మాత్రమే ఉన్నందున, ఆమోద కేంద్రంలో పెండింగ్‌లో ఉన్న '{pending_id or 'ACT_001'}' (15mm నీటిపారుదల) ప్రతిపాదనను వెంటనే ఆమోదించండి."
            )
        return (
            f"ప్రస్తుతం నీటిపారుదల అవసరం లేదు. ESP32 నేల తేమ {m}% వద్ద సురక్షిత స్థాయిలో (>= 30.0%) ఉంది, "
            f"నేల ఉష్ణోగ్రత {t}°C మరియు pH {ph} సమతుల్యంగా ఉన్నాయి. పెండింగ్ ఆమోదాలు: {pending_count}."
        )

    if lang == "hi":
        if needs_water:
            return (
                f"हाँ, आपको आज तुरंत सिंचाई करनी चाहिए। ESP32 सेंसर (GPIO 34) के अनुसार वर्तमान मिट्टी की नमी {m}% है, "
                f"जो धान (वानस्पतिक अवस्था) की 30.0% न्यूनतम सीमा से कम है। मिट्टी का तापमान {t}°C (pH {ph}, NPK {nitrogen:.1f}/{phosphorus:.1f}/{potassium:.1f} mg/kg) है "
                f"और अगले 6 घंटों में बारिश की संभावना केवल {precip_prob}% है — कृपया अनुमोदन केंद्र में लंबित प्रस्ताव '{pending_id or 'ACT_001'}' (15mm सिंचाई) को स्वीकृत करें।"
            )
        return (
            f"अभी सिंचाई की आवश्यकता नहीं है। ESP32 मिट्टी की नमी {m}% है जो 30.0% सुरक्षा सीमा से ऊपर है "
            f"(तापमान {t}°C, pH {ph})। लंबित अनुमोदन: {pending_count}।"
        )

    # Default: English
    if needs_water:
        return (
            f"Yes — you should irrigate today. Live ESP32 soil moisture on GPIO 34 is {m}%, which is below the 30.0% critical threshold "
            f"for Rice in the Vegetative stage. Root-zone temperature is {t}°C (pH {ph}, NPK {nitrogen:.1f}/{phosphorus:.1f}/{potassium:.1f} mg/kg) "
            f"with only a {precip_prob}% 6-hour rain probability from Open-Meteo. Please approve pending action {pending_id or 'ACT_001'} (Irrigate Zone 1 — 15mm) in the Approval Center."
        )
    return (
        f"No irrigation is required right now. Live ESP32 soil moisture is {m}% (safely above the 30.0% critical threshold for Vegetative Rice), "
        f"soil temperature is {t}°C, pH is {ph}, and there are {pending_count} pending actions."
    )


@router.post("/assistant/chat", response_model=AssistantChatOut)
async def assistant_chat(
    payload: AssistantChatIn,
    db: Session = Depends(get_db),
):
    farm = db.get(Farm, settings.DEFAULT_FARM_ID)
    latest = db.scalars(
        select(TelemetryLog).order_by(TelemetryLog.id.desc()).limit(1)
    ).first()
    pending_actions = db.scalars(
        select(ProposedAction).where(
            ProposedAction.status == ActionStatus.PENDING_APPROVAL.value
        )
    ).all()
    weather = await fetch_open_meteo_precipitation()

    moisture = latest.soil_moisture if latest else 18.5
    soil_temp = latest.soil_temperature if latest else 27.5
    soil_ph = latest.soil_ph if latest else 6.8
    nitrogen = latest.nitrogen if latest else 32.0
    phosphorus = latest.phosphorus if latest else 20.0
    potassium = latest.potassium if latest else 185.0
    precip_prob = int(weather.get("precip_prob", 5))
    pending_id = pending_actions[0].id if pending_actions else None

    fallback_reply = _build_grounded_fallback_reply(
        message=payload.message,
        lang=payload.language,
        moisture=moisture,
        soil_temp=soil_temp,
        soil_ph=soil_ph,
        nitrogen=nitrogen,
        phosphorus=phosphorus,
        potassium=potassium,
        precip_prob=precip_prob,
        pending_count=len(pending_actions),
        pending_id=pending_id,
    )

    api_key = (
        os.getenv("LLM_API_KEY")
        or os.getenv("GROQ_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or ""
    ).strip()

    reply = fallback_reply
    if api_key:
        base_url = os.getenv(
            "LLM_BASE_URL", "https://api.groq.com/openai/v1/chat/completions"
        )
        model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
        lang_label = {
            "en": "English",
            "te": "Telugu script (తెలుగు)",
            "hi": "Hindi script (हिंदी)",
        }[payload.language]

        sys_prompt = (
            f"You are the AI FarmWise Agronomist Assistant. Reply concisely (2-3 sentences) in {lang_label}. "
            f"Ground your answer strictly in this live farm telemetry: "
            f"Crop={farm.crop if farm else 'Rice'} ({farm.growth_stage if farm else 'Vegetative'}), "
            f"ESP32 Soil Moisture={moisture:.1f}% (critical threshold=30.0%), "
            f"Soil Temperature={soil_temp:.1f}°C, Soil pH={soil_ph:.2f}, "
            f"NPK={nitrogen:.1f}/{phosphorus:.1f}/{potassium:.1f} mg/kg, "
            f"Open-Meteo 6h Rain Probability={precip_prob}%, "
            f"Pending Approval Actions={len(pending_actions)} ({pending_id or 'None'})."
        )
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    base_url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": payload.message},
                        ],
                        "temperature": 0.2,
                    },
                )
                if resp.status_code == 200:
                    llm_text = (
                        resp.json()["choices"][0]["message"]["content"] or ""
                    ).strip()
                    if llm_text:
                        reply = llm_text
        except Exception:
            reply = fallback_reply

    return AssistantChatOut(
        reply=reply,
        language=payload.language,
        context_summary={
            "soil_moisture": round(float(moisture), 1),
            "soil_temperature": round(float(soil_temp), 1),
            "soil_ph": round(float(soil_ph), 2),
            "precip_prob": precip_prob,
            "pending_actions": len(pending_actions),
        },
    )
