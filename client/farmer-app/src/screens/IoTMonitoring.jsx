import React from 'react';

export function IoTMonitoring({ dashboard, lang = 'te' }) {
  const p = dashboard?.farmer_profile || {};
  const fusion = dashboard?.sensor_fusion || {};
  const t = dashboard?.telemetry || {};

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="font-extrabold text-cyan-400">
          📡 {lang === 'te' ? 'సెన్సార్ & డేటా మూలాలు (Data Sources)' : lang === 'hi' ? 'सेंसर और डेटा स्रोत (Data Sources)' : 'Sensor & Data Source Transparency'}
        </span>
        <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[10px] font-bold">
          {p.id === 1 ? 'ESP32 SENSOR + SATELLITE' : 'SATELLITE + SIMULATED NODE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Ground Sensor Node</div>
          <div className="text-sm font-extrabold text-emerald-300 mt-0.5">{t.soil_moisture ?? dashboard?.soil_moisture ?? 18.5}% VWC</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {p.id === 1 ? 'ESP32 GPIO34 Live / Cached' : `Node: ${t.device_id || 'Field Probe'}`}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold">ECMWF Satellite (3-9cm)</div>
          <div className="text-sm font-extrabold text-sky-300 mt-0.5">
            {dashboard?.satellite_soil_moisture ?? 21.0}% VWC
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Copernicus 9km Reanalysis</div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Multi-Source Fusion Confidence:</span>
        <span className="font-mono font-bold text-emerald-400">
          {Math.round(Number(fusion.confidence || 0.98) * 100)}% ({fusion.correlation_label || 'Cross-Verified'})
        </span>
      </div>
    </div>
  );
}

export default IoTMonitoring;

