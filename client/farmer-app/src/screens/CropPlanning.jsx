import React from 'react';

export function CropPlanning({ dashboard, lang = 'te' }) {
  const plan = dashboard?.agent_intelligence?.crop_planning || {};
  const crops = plan.suitable_crops || [];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="font-extrabold text-emerald-400">
          🗓️ {lang === 'te' ? 'పంట ప్రణాళిక & విత్తే సమయం (Crop Planning)' : lang === 'hi' ? 'फसल योजना और बुवाई मार्गदर्शन (Crop Planning)' : 'Crop Planning & Sowing Guidance'}
        </span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
          {plan.data_source || 'AI ESTIMATE + HISTORICAL DATA'}
        </span>
      </div>

      <div className="space-y-2.5">
        {crops.map((c, idx) => {
          const why = lang === 'te' ? c.why_te || c.why : lang === 'hi' ? c.why_hi || c.why : c.why;
          return (
            <div key={idx} className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-white text-sm">{c.crop}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  {c.suitability_score}% Match
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Sowing Window: </span>
                  <span className="text-slate-200 font-semibold">{c.sowing_window}</span>
                </div>
                <div>
                  <span className="text-slate-400">Duration: </span>
                  <span className="text-slate-200 font-semibold">{c.duration_days} Days</span>
                </div>
                <div>
                  <span className="text-slate-400">Water Need: </span>
                  <span className="text-sky-300 font-semibold">{c.water_requirement}</span>
                </div>
                <div>
                  <span className="text-slate-400">Harvest Window: </span>
                  <span className="text-amber-300 font-semibold">{c.expected_harvest_period}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-emerald-400">WHY: </span>
                {why}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CropPlanning;

