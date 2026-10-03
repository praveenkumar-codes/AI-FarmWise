import React from 'react';

const TONES = {
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  REJECTED: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  DISPATCHED: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  OK: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  NOT_IMPLEMENTED: 'bg-slate-700/50 text-slate-300 border-slate-600',
  CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse',
};

export function StatusBadge({ status, label }) {
  const tone = TONES[status] || 'bg-slate-800 text-slate-300 border-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tone}`}>
      {label || status}
    </span>
  );
}

export default StatusBadge;
