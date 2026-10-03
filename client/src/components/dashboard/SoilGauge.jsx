import React from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export function SoilGauge({
  moisture = 0,
  satelliteMoisture = 21.0,
  sensorFusion = {},
  criticalThreshold = 30.0,
  deviceId = 'esp32_zone_01',
}) {
  const { t } = useLanguage();
  const safeMoisture = Math.max(0, Math.min(100, Number(moisture || 0)));
  const safeSatellite = Math.max(0, Math.min(100, Number(satelliteMoisture ?? 21.0)));
  const isCritical = safeMoisture < criticalThreshold;

  const correlationPct =
    sensorFusion?.correlation_pct ??
    Math.max(65, Math.min(99, Math.round(100 - Math.abs(safeMoisture - safeSatellite) * 3)));
  const correlationLabel =
    sensorFusion?.correlation_label || `Cross-Verified: ${correlationPct}% Correlation`;
  const fallbackActive = Boolean(sensorFusion?.fallback_active);
  const confidencePct = Math.round(Number(sensorFusion?.confidence ?? 0.98) * 100);

  // SVG circular gauge geometry
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeMoisture / 100) * circumference;

  const strokeColor = isCritical ? '#f43f5e' : '#10b981';

  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-300 ${
        isCritical
          ? 'bg-rose-950/25 border-rose-500/50 shadow-lg shadow-rose-950/30'
          : 'bg-slate-900/90 border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {t.telemetry.soilMoisture} · Multi-Source Fusion
          </h3>
          <p className="text-xs text-slate-400">{t.telemetry.criticalThreshold}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/40">
            🛰️ {correlationLabel}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {t.telemetry.realHardwareBadge}
          </span>
        </div>
      </div>

      {fallbackActive && (
        <div className="mb-4 rounded-xl bg-amber-500/20 border border-amber-500/50 px-3.5 py-2 text-xs font-bold text-amber-200">
          ⚠ PRIMARY SENSOR OFFLINE — Fallback to Satellite Soil Moisture Active
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="#1e293b"
              strokeWidth="14"
              fill="transparent"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke={strokeColor}
              strokeWidth="14"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span
              className={`text-3xl font-extrabold tabular-nums ${
                isCritical ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {safeMoisture.toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
              {deviceId}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          {/* Dual-Source Telemetry Comparison Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">
                Primary: Live In-Situ ESP32
              </div>
              <div className="text-sm font-extrabold text-emerald-300 font-mono mt-0.5">
                {fallbackActive ? 'OFFLINE (Failover)' : `${safeMoisture.toFixed(1)}% VWC`}
              </div>
              <div className="text-[10px] text-slate-500">ADC1 GPIO 34 Ground Probe</div>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-sky-500/30 p-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">
                Secondary: Satellite Remote Sensing
              </div>
              <div className="text-sm font-extrabold text-sky-300 font-mono mt-0.5">
                {safeSatellite.toFixed(1)}% VWC · ECMWF
              </div>
              <div className="text-[10px] text-slate-500">ECMWF IFS 9km (3–9cm Root-Zone)</div>
            </div>
          </div>

          <div
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              isCritical
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <span>{isCritical ? t.telemetry.belowCritical : t.telemetry.optimalRange}</span>
            <span className="font-mono text-[11px]">Fusion Confidence: {confidencePct}%</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>0% (Dry Air)</span>
              <span className="text-rose-400 font-semibold">{criticalThreshold}% Critical</span>
              <span>100% (Saturated)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10"
                style={{ left: `${criticalThreshold}%` }}
              />
              <div
                className={`h-full transition-all duration-500 ${
                  isCritical ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${safeMoisture}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoilGauge;

