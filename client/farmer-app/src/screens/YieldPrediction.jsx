import React from "react";
import { t } from "../i18n/translations";

export default function YieldPrediction({ data, lang }) {
  const ai = data?.agent_intelligence || {};
  const yp = ai?.yield_prediction || data?.analytics || {};
  const estYield = yp?.estimated_yield_tonnes ?? data?.analytics?.yield_estimate_tonnes ?? 4.2;
  const minYield = yp?.yield_range_min ?? 3.6;
  const maxYield = yp?.yield_range_max ?? 4.8;
  const confidence = yp?.confidence ?? 84;
  const posFactors = yp?.positive_factors || [
    "Optimal NPK levels and root-zone soil pH",
    "Timely precision irrigation scheduling",
    "Active crop-stage monitoring and pest scouting"
  ];
  const negFactors = yp?.negative_factors || [
    "Mid-season afternoon heat stress window",
    "Localized root-zone moisture variance"
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            {t(lang, "yieldEstTitle") || "Yield Prediction & Estimation"}
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            {yp?.crop_name || data?.farmer?.crop || "Guntur Teja Chili"} Harvest Forecast
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
          {yp?.source_label || "AI ESTIMATE"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center">
          <div className="text-[10px] text-emerald-700 font-bold uppercase">Estimated Yield</div>
          <div className="text-lg font-black text-emerald-900 mt-0.5">{estYield} t</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Expected Range</div>
          <div className="text-sm font-black text-slate-800 mt-1">{minYield} – {maxYield} t</div>
        </div>
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-center">
          <div className="text-[10px] text-sky-700 font-bold uppercase">AI Confidence</div>
          <div className="text-lg font-black text-sky-900 mt-0.5">{confidence}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
          <div className="font-extrabold text-emerald-800 mb-1.5">+ Positive Yield Drivers</div>
          <ul className="space-y-1 text-slate-700">
            {posFactors.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-100">
          <div className="font-extrabold text-amber-800 mb-1.5">- Risk / Limiting Factors</div>
          <ul className="space-y-1 text-slate-700">
            {negFactors.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">!</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

