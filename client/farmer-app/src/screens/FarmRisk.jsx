import React from "react";

export default function FarmRisk({ data }) {
  const ai = data?.agent_intelligence || {};
  const trace = ai?.workflow_trace || [
    { step: "OBSERVE", detail: "Ingested ESP32 moisture, ECMWF satellite soil layer, and Open-Meteo forecast" },
    { step: "UNDERSTAND", detail: "Evaluated crop stage moisture threshold & evapotranspiration demand" },
    { step: "PLAN", detail: "Formulated multi-agent irrigation, nutrient, and pest defense schedule" },
    { step: "SELECT AGENT/TOOL", detail: "Selected IrrigationAgent + CapabilityRegistry (IrrigationTool / FarmerTaskTool)" },
    { step: "EXECUTE", detail: "Prepared MAVLink / Valve dispatch & human-in-the-loop approval card" },
    { step: "OBSERVE RESULT", detail: "Verified soil sensor feedback loop & audit log persistence" },
    { step: "EVALUATE", detail: "Confirmed projected +18% water savings and zero runoff risk" },
    { step: "REPLAN IF REQUIRED", detail: "Standby fallback to FarmerTaskTool if hardware or drone offline" },
    { step: "RECOMMEND/ACT", detail: "Published localized explanation in English, Telugu, and Hindi" }
  ];

  const weatherAlerts = ai?.weather_alerts || [];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
            Weather Risk & Multi-Agent Loop
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            FarmManagerAgent Autonomous Reasoning Trace
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          9-Step Agent Loop
        </span>
      </div>

      {weatherAlerts.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {weatherAlerts.map((wa, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
              <span className="font-extrabold">[{wa.severity || "ADVISORY"}] {wa.title}: </span>
              <span>{wa.advisory}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {trace.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-extrabold text-[10px] shrink-0">
              {idx + 1}. {item.step}
            </span>
            <span className="text-slate-700">{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

