import React from 'react';
import { Button } from '../common/Button.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export function ActionCard({ action, onDecision, busy = false, emergencyStop = false }) {
  const { t } = useLanguage();
  const isPending = action.status === 'PENDING_APPROVAL';

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isPending
          ? 'bg-slate-900/95 border-amber-500/40 shadow-lg shadow-amber-950/20'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
              {action.id}
            </span>
            <span className="text-xs font-mono text-slate-400">{action.type}</span>
          </div>
          <h4 className="text-lg font-bold text-slate-100 mt-1">{action.title}</h4>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={action.status} />
          {action.execution_ref && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
              {action.execution_ref}
            </span>
          )}
        </div>
      </div>

      {/* Causal WHY Explanation */}
      <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 mb-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
          {t.approvals.whyLabel}
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{action.why}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Evidence Checklist */}
        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-2">
            {t.approvals.evidenceLabel}
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {(action.evidence || []).map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Missing Data Warnings */}
        <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-2">
            {t.approvals.missingDataLabel}
          </div>
          <ul className="space-y-1.5 text-xs text-amber-200">
            {(action.missing_data || []).map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isPending && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => onDecision(action.id, 'REJECTED')}
          >
            {t.approvals.reject}
          </Button>
          <Button
            variant="primary"
            disabled={busy || emergencyStop}
            onClick={() => onDecision(action.id, 'APPROVED')}
          >
            {t.approvals.approveDispatch}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ActionCard;
