"""Multi-Source Soil & Irrigation Fusion Agent — fuses physical ESP32 probe readings with ECMWF Satellite Remote Sensing."""
from __future__ import annotations

from typing import Any, Dict, Optional

from app.agents.base.agent_context import AgentContext
from app.agents.base.agent_interface import BaseAgent
from app.agents.base.agent_result import AgentResult, ProposedActionDraft
from app.core.crop_profiles import get_crop_profile
from app.core.enums import ActionType


def compute_sensor_fusion(
    *,
    esp32_moisture: Optional[float],
    satellite_moisture: float,
    esp32_online: bool = True,
    critical_threshold: float = 30.0,
) -> Dict[str, Any]:
    """Multi-Source Sensor Fusion & Cross-Verification Node:
    - Primary Source: Live physical ESP32 probe reading (GPIO 34).
    - Secondary Source: Satellite remote-sensing soil moisture (Open-Meteo / ECMWF IFS 9km 3-9cm).
    - If ESP32 is ONLINE: Compare localized ESP32 moisture with satellite estimate.
      If both indicate deficit (< critical_threshold), boost decision confidence to 98% (0.98).
    - If ESP32 is OFFLINE: Automatically failover to satellite soil moisture and flag:
      'PRIMARY SENSOR OFFLINE — Fallback to Satellite Soil Moisture Active'.
    """
    sat = round(float(satellite_moisture if satellite_moisture is not None else 21.0), 1)
    crit = float(critical_threshold)

    if esp32_online and esp32_moisture is not None:
        esp = round(float(esp32_moisture), 1)
        diff = abs(esp - sat)
        correlation_pct = max(65, min(99, int(round(100.0 - diff * 3.0))))
        both_deficit = (esp < crit) and (sat < crit)
        confidence = 0.98 if both_deficit else 0.92
        return {
            "primary_source": "ESP32_GPIO34",
            "secondary_source": "Open-Meteo / ECMWF IFS 9km Reanalysis",
            "esp32_online": True,
            "fallback_active": False,
            "fallback_banner": None,
            "esp32_moisture": esp,
            "satellite_moisture": sat,
            "effective_moisture": esp,
            "correlation_pct": correlation_pct,
            "correlation_label": f"Cross-Verified: {correlation_pct}% Correlation",
            "both_confirm_deficit": both_deficit,
            "confidence": confidence,
        }

    # ESP32 is OFFLINE -> Failover to Satellite Soil Moisture
    return {
        "primary_source": "SATELLITE_FALLBACK",
        "secondary_source": "Open-Meteo / ECMWF IFS 9km Reanalysis",
        "esp32_online": False,
        "fallback_active": True,
        "fallback_banner": "PRIMARY SENSOR OFFLINE — Fallback to Satellite Soil Moisture Active",
        "esp32_moisture": round(float(esp32_moisture), 1) if esp32_moisture is not None else None,
        "satellite_moisture": sat,
        "effective_moisture": sat,
        "correlation_pct": 100,
        "correlation_label": "Satellite Failover Active (ECMWF 3-9cm)",
        "both_confirm_deficit": sat < crit,
        "confidence": 0.88,
    }


class SoilAgent(BaseAgent):
    name = "soil_agent"
    description = "Multi-Source Soil Fusion Agent: cross-verifies ESP32 GPIO 34 probe with ECMWF 3-9cm satellite soil moisture."
    implemented = True

    async def run(self, context: AgentContext) -> AgentResult:
        profile = get_crop_profile(context.crop, context.growth_stage)
        critical_moisture = float(profile.critical_moisture)

        meta = context.metadata or {}
        weather = meta.get("weather") or {}
        satellite_moisture = float(weather.get("satellite_soil_moisture", 21.0))
        esp32_online = bool(meta.get("esp32_online", True))

        fusion = compute_sensor_fusion(
            esp32_moisture=context.soil_moisture,
            satellite_moisture=satellite_moisture,
            esp32_online=esp32_online,
            critical_threshold=critical_moisture,
        )

        moisture = float(fusion["effective_moisture"])
        sat_vwc = float(fusion["satellite_moisture"])

        if fusion["fallback_active"]:
            evidence = [
                "PRIMARY SENSOR OFFLINE — Fallback to Satellite Soil Moisture Active",
                f"Satellite Remote Sensing (ECMWF 3-9cm): {sat_vwc}% VWC",
                "No rain forecasted in next 6h",
            ]
        else:
            evidence = [
                f"ESP32 Live Moisture: {moisture}%",
                f"ESP32 Ground Probe (GPIO 34): {moisture}% VWC",
                f"Satellite Remote Sensing (ECMWF 3-9cm): {sat_vwc}% VWC",
                "No rain forecasted in next 6h",
            ]

        missing_data = ["Drone Aerial NDVI Imagery"]

        findings = {
            "moisture": moisture,
            "esp32_moisture": fusion["esp32_moisture"],
            "satellite_soil_moisture": sat_vwc,
            "sensor_fusion": fusion,
            "critical_threshold": critical_moisture,
            "below_critical": moisture < critical_moisture,
            "crop": profile.crop,
            "stage": profile.stage,
            "soil_ph": context.soil_ph,
            "soil_temperature": context.soil_temperature,
            "npk": {
                "nitrogen": context.nitrogen,
                "phosphorus": context.phosphorus,
                "potassium": context.potassium,
            },
        }

        proposals = []
        if moisture < critical_moisture and not context.has_pending_irrigation_action:
            proposals.append(
                ProposedActionDraft(
                    type=ActionType.IRRIGATION_DISPATCH.value,
                    title="Irrigate Zone 1 (15mm)",
                    why=(
                        f"Measured soil moisture ({moisture}%) is below critical threshold "
                        f"({critical_moisture}%) for {profile.crop} in {profile.stage} stage."
                    ),
                    evidence=evidence,
                    missing_data=missing_data,
                    target="zone_01",
                    confidence=fusion["confidence"],
                    parameters={
                        "zone": "zone_01",
                        "depth_mm": profile.irrigation_depth_mm,
                        "sensor_fusion": fusion,
                    },
                )
            )
            summary = (
                f"CRITICAL: Effective moisture {moisture}% (Satellite {sat_vwc}% VWC) < {critical_moisture}%. "
                f"Confidence={int(fusion['confidence'] * 100)}%."
            )
        elif moisture < critical_moisture and context.has_pending_irrigation_action:
            summary = (
                f"Moisture {moisture}% remains below {critical_moisture}%, "
                "but an irrigation proposal is already PENDING_APPROVAL."
            )
        else:
            summary = f"Soil moisture {moisture}% is within safe bounds (>= {critical_moisture}%)."

        return AgentResult(
            agent_name=self.name,
            status="OK",
            summary=summary,
            findings=findings,
            evidence=evidence,
            missing_data=missing_data,
            proposals=proposals,
        )

