import React from "react";
import { t } from "../i18n/translations";

export default function HarvestPlanning({ data, lang }) {
  const hp = data?.agent_intelligence?.harvest_plan || {};
  const readiness = hp?.readiness_status || "APPROACHING_MATURITY";
  const maturity = hp?.maturity_percent ?? 78;
  const windowStart = hp?.optimal_window_start || "2025-03-18";
  const windowEnd = hp?.optimal_window_end || "2025-03-26";
  const market = hp?.recommended_market || "Guntur Mirchi Yard";
  const weatherNote = hp?.weather_outlook || "Clear skies expected during primary harvest window (rain risk < 20%).";
  const prepTasks = hp?.preparation_checklist || [
    "Suspend nitrogen application 14 days prior to harvest",
    "Schedule sun-drying tarpaulins & moisture meters",
    "Book transport slot to Guntur Mirchi Yard"
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
            {t(lang, "harvestPlanTitle") || "Harvest Planning & Readiness"}
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            Harvest Window: {windowStart} → {windowEnd}
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
          {readiness}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
          <span>Crop Maturity Index</span>
          <span className="text-emerald-700">{maturity}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, maturity)}%` }} />
        </div>
      </div>

      <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 text-xs text-slate-700 mb-3">
        <div className="font-bold text-sky-900 mb-0.5">Weather & Market Advisory ({market})</div>
        <div>{weatherNote}</div>
      </div>

      <div className="text-xs font-extrabold text-slate-800 mb-1.5">Pre-Harvest Preparation Checklist</div>
      <div className="space-y-1.5">
        {prepTasks.map((task, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
              {idx + 1}
            </span>
            <span>{task}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

