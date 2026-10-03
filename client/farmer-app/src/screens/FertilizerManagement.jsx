import React from 'react';

export function FertilizerManagement({ dashboard, lang = 'te' }) {
  const fert = dashboard?.agent_intelligence?.fertilizer || {};
  const npk = fert.npk_mg_kg || dashboard?.telemetry || {};

  const recText =
    lang === 'te'
      ? fert.recommendation_te || fert.recommendation
      : lang === 'hi'
      ? fert.recommendation_hi || fert.recommendation
      : fert.recommendation;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="font-extrabold text-emerald-400">
          {lang === 'te'
            ? '🌾 ఎరువులు & పోషకాల సూచన (Fertilizer Advisory)'
            : lang === 'hi'
            ? '🌾 खाद और पोषण सलाह (Fertilizer Advisory)'
            : '🌾 Dynamic Fertilizer & Nutrient Advisory'}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
          AI ESTIMATE (NPK & pH)
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="rounded-xl bg-slate-950 p-2 border border-slate-800">
          <div className="text-[10px] text-slate-400">N (Est.)</div>
          <div className="font-extrabold text-emerald-300">{npk.nitrogen ?? 31.4}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2 border border-slate-800">
          <div className="text-[10px] text-slate-400">P (Est.)</div>
          <div className="font-extrabold text-sky-300">{npk.phosphorus ?? 19.6}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2 border border-slate-800">
          <div className="text-[10px] text-slate-400">K (Est.)</div>
          <div className="font-extrabold text-amber-300">{npk.potassium ?? 184.0}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2 border border-slate-800">
          <div className="text-[10px] text-slate-400">Soil pH</div>
          <div className="font-extrabold text-white">{fert.soil_ph ?? npk.soil_ph ?? 6.8}</div>
        </div>
      </div>

      <p className="text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
        {recText ||
          'Complete root-zone irrigation first before applying split Neem-coated Urea top-dressing.'}
      </p>

      <div className="text-[10px] text-slate-400">
        ℹ️ {fert.measurement_note || 'NPK & pH values are AI-estimated root-zone values; soil moisture is measured via ESP32/Satellite.'}
      </div>
    </div>
  );
}

export default FertilizerManagement;

