import React from 'react';

export function MetricCard({ title, value, unit, rangeText, badge, accent = 'emerald' }) {
  const borderColors = {
    emerald: 'border-emerald-500/30',
    sky: 'border-sky-500/30',
    amber: 'border-amber-500/30',
    violet: 'border-violet-500/30',
    rose: 'border-rose-500/40',
  };

  return (
    <div
      className={`rounded-xl bg-slate-900/90 border ${
        borderColors[accent] || borderColors.emerald
      } p-4 shadow-md flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl font-bold text-slate-100 tabular-nums">
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {rangeText && <div className="text-[11px] text-slate-400 mt-1">{rangeText}</div>}
    </div>
  );
}

export default MetricCard;
