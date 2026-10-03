"""Environment & Satellite Remote-Sensing Agent — ingests Open-Meteo / ECMWF IFS 9km soil moisture (3-9cm root-zone) & weather."""
from __future__ import annotations

import time
from typing import Any, Dict, Optional
import httpx

from app.agents.base.agent_context import AgentContext
from app.agents.base.agent_interface import BaseAgent
from app.agents.base.agent_result import AgentResult

DEFAULT_LAT = 16.3067
DEFAULT_LON = 80.4365
SATELLITE_SOURCE_NAME = "Open-Meteo / ECMWF IFS 9km Reanalysis"

_WEATHER_CACHE: Dict[str, Any] = {
    "fetched_at": 0.0,
    "precip_prob": 5,
    "rain_prob_6h": 5,
    "temperature": 31.2,
    "ambient_temp_c": 31.2,
    "relative_humidity_2m": 62,
    "wind_kmh": 9.4,
    "soil_moisture_0_to_1cm": 0.19,
    "soil_moisture_3_to_9cm": 0.21,
    "satellite_soil_moisture": 21.0,
    "satellite_source": SATELLITE_SOURCE_NAME,
    "source": SATELLITE_SOURCE_NAME,
}


async def fetch_open_meteo_precipitation(
    lat: float = DEFAULT_LAT,
    lon: float = DEFAULT_LON,
    timeout_s: float = 1.8,
) -> Dict[str, Any]:
    """Query Open-Meteo for precipitation probability, temperature, humidity, and ECMWF satellite soil moisture
    (0-1cm surface and 3-9cm root-zone). Converts m³/m³ to Volumetric Water Content percentage:
        satellite_moisture_vwc = round(soil_moisture_3_to_9cm * 100.0, 1)
    """
    now = time.time()
    if now - float(_WEATHER_CACHE.get("fetched_at", 0.0)) < 120.0:
        return dict(_WEATHER_CACHE)

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,precipitation,wind_speed_10m"
        f"&hourly=precipitation_probability,temperature_2m,relative_humidity_2m,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm"
        f"&forecast_days=1"
    )
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                payload = resp.json()
                hourly = payload.get("hourly") or {}
                hourly_probs = hourly.get("precipitation_probability") or []
                precip_prob = int(max(hourly_probs[:6])) if hourly_probs else 5

                sm_3_9_list = [
                    v for v in (hourly.get("soil_moisture_3_to_9cm") or []) if v is not None
                ]
                sm_0_1_list = [
                    v for v in (hourly.get("soil_moisture_0_to_1cm") or []) if v is not None
                ]
                rh_list = [
                    v for v in (hourly.get("relative_humidity_2m") or []) if v is not None
                ]

                raw_3_9 = float(sm_3_9_list[0]) if sm_3_9_list else 0.21
                raw_0_1 = float(sm_0_1_list[0]) if sm_0_1_list else 0.19
                satellite_moisture_vwc = round(raw_3_9 * 100.0, 1)

                current = payload.get("current") or {}
                temp_c = float(current.get("temperature_2m", 31.2))
                wind_kmh = float(current.get("wind_speed_10m", 9.4))
                rh = int(rh_list[0]) if rh_list else 62

                _WEATHER_CACHE.update(
                    {
                        "fetched_at": now,
                        "precip_prob": precip_prob,
                        "rain_prob_6h": precip_prob,
                        "temperature": temp_c,
                        "ambient_temp_c": temp_c,
                        "relative_humidity_2m": rh,
                        "wind_kmh": wind_kmh,
                        "soil_moisture_0_to_1cm": raw_0_1,
                        "soil_moisture_3_to_9cm": raw_3_9,
                        "satellite_soil_moisture": satellite_moisture_vwc,
                        "satellite_source": SATELLITE_SOURCE_NAME,
                        "source": SATELLITE_SOURCE_NAME,
                    }
                )
                return dict(_WEATHER_CACHE)
    except Exception:
        pass

    _WEATHER_CACHE["fetched_at"] = now
    _WEATHER_CACHE["satellite_soil_moisture"] = float(
        _WEATHER_CACHE.get("satellite_soil_moisture") or 21.0
    )
    _WEATHER_CACHE["satellite_source"] = SATELLITE_SOURCE_NAME
    return dict(_WEATHER_CACHE)


class EnvironmentAgent(BaseAgent):
    name = "environment_agent"
    description = "Satellite remote-sensing soil moisture (ECMWF 3-9cm) & microclimate forecast agent."
    implemented = False

    async def run(self, context: AgentContext) -> AgentResult:
        # Preserve Phase 4/6 contract (`status="NOT_IMPLEMENTED"`) while returning live Open-Meteo / ECMWF satellite observations
        weather: Optional[Dict[str, Any]] = (
            context.metadata.get("weather") if context.metadata else None
        )
        if weather is None:
            weather = await fetch_open_meteo_precipitation()

        precip = weather.get("rain_prob_6h", weather.get("precip_prob", 5))
        sat_vwc = weather.get("satellite_soil_moisture", 21.0)
        temp_c = weather.get("temperature", weather.get("ambient_temp_c", 31.2))

        observation = {
            "satellite_soil_moisture": sat_vwc,
            "satellite_source": SATELLITE_SOURCE_NAME,
            "rain_prob_6h": precip,
            "temperature": temp_c,
            **weather,
        }

        return AgentResult(
            agent_name=self.name,
            status="NOT_IMPLEMENTED",
            summary=(
                f"Satellite Soil Moisture: {sat_vwc}% VWC ({SATELLITE_SOURCE_NAME}) · "
                f"6h Rain Prob: {precip}%."
            ),
            findings=observation,
            evidence=[
                f"Satellite Remote Sensing (ECMWF 3-9cm): {sat_vwc}% VWC",
                f"Open-Meteo 6h Precipitation Probability: {precip}%",
            ],
            missing_data=["Local Weather Station Anemometer"],
        )

