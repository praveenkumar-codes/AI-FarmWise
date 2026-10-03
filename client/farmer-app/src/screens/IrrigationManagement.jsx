import React from 'react';

export function IrrigationManagement({ dashboard, lang = 'te' }) {
  const irr = dashboard?.agent_intelligence?.irrigation || {};
  const moisture = Number(irr.soil_moisture_pct ?? dashboard?.soil_moisture ?? 18.5);
  const crit = Number(irr.critical_threshold_pct ?? dashboard?.crop_bounds?.critical_moisture ?? 30.0);
  const rainProb = Number(irr.rain_probability_pct ?? dashboard?.weather?.precip_prob ?? 5);
  const needsWater = Boolean(irr.irrigation_required ?? (moisture < crit && rainProb < 60));
  const depthMm = Number(irr.recommended_depth_mm ?? (needsWater ? 15 : 0));
  const mins = Number(irr.duration_mins ?? (needsWater ? 35 : 0));

  const reasonText =
    lang === 'te'
      ? irr.reason_te || irr.reason
      : lang === 'hi'
      ? irr.reason_hi || irr.reason
      : irr.reason;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="font-extrabold text-sky-400">
          {lang === 'te'
            ? '💧 నీటి నిర్వహణ & AI నిర్ణయం (Smart Irrigation)'
            : lang === 'hi'
            ? '💧 सिंचाई समय और AI निर्णय (Smart Irrigation)'
            : '💧 Smart Irrigation Decision & Schedule'}
        </span>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
          {irr.data_source || 'ESP32 SENSOR + WEATHER API'}
        </span>
      </div>

      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
        <div className={`text-xs font-black ${needsWater ? 'text-amber-300' : 'text-emerald-400'}`}>
          {irr.decision || (needsWater ? 'IRRIGATION REQUIRED IMMEDIATELY' : 'IRRIGATION NOT REQUIRED')}
        </div>
        {reasonText && <p className="text-slate-300 leading-relaxed">{reasonText}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'నీటి పరిమాణం' : lang === 'hi' ? 'सिंचाई मात्रा' : 'Water Dose'}
          </div>
          <div className="font-extrabold text-sky-300 mt-0.5">
            {needsWater ? `${depthMm} mm (${mins}m)` : '0 mm (Hold)'}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'వర్ష సూచన (6h)' : lang === 'hi' ? 'बारिश संभावना' : 'Rain Prob (6h)'}
          </div>
          <div className="font-extrabold text-amber-300 mt-0.5">{rainProb}%</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'నీటి ఆదా' : lang === 'hi' ? 'पानी की बचत' : 'Water Saved'}
          </div>
          <div className="font-extrabold text-emerald-400 mt-0.5">
            {dashboard?.analytics?.water_saved_pct ?? 28.4}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default IrrigationManagement;

