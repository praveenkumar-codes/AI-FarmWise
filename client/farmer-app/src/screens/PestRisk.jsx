import React from 'react';

export function PestRisk({ dashboard, lang = 'te' }) {
  const pest = dashboard?.agent_intelligence?.pest_disease || {};
  const risk = pest.risk_level || 'LOW';
  const isElevated = risk === 'HIGH' || risk === 'MODERATE';

  const recText =
    lang === 'te'
      ? pest.recommendation_te || pest.recommendation
      : lang === 'hi'
      ? pest.recommendation_hi || pest.recommendation
      : pest.recommendation;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2.5 shadow-lg text-xs">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="font-extrabold text-amber-400">
          {lang === 'te'
            ? '🛡️ పురుగులు & తెగుళ్ల హెచ్చరిక (Pest & Disease Alert)'
            : lang === 'hi'
            ? '🛡️ कीट एवं रोग चेतावनी (Pest & Disease Alert)'
            : '🛡️ Pest & Disease Risk Analysis'}
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            isElevated
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {risk} RISK · {pest.severity || 'Low'}
        </span>
      </div>

      <div className="font-bold text-white">{pest.possible_issue || 'Low Pest & Fungal Pressure'}</div>

      <p className="text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
        {recText}
      </p>

      {Array.isArray(pest.evidence) && pest.evidence.length > 0 && (
        <div className="space-y-1 text-[11px] text-slate-400">
          {pest.evidence.map((ev, i) => (
            <div key={i}>• {ev}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PestRisk;

