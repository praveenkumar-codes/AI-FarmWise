import React from 'react';
import { ActionCard } from './ActionCard.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export function ApprovalCenter({
  actions = [],
  onDecision,
  busy = false,
  emergencyStop = false,
}) {
  const { t } = useLanguage();
  const pending = actions.filter((a) => a.status === 'PENDING_APPROVAL');
  const resolved = actions.filter((a) => a.status !== 'PENDING_APPROVAL');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{t.approvals.title}</h2>
          <p className="text-xs text-slate-400">{t.approvals.subtitle}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
          {t.approvals.pendingCount}: {pending.length}
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 text-center text-sm text-slate-400">
          {t.approvals.noPending}
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onDecision={onDecision}
              busy={busy}
              emergencyStop={emergencyStop}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t.approvals.historyTitle}
          </h3>
          <div className="space-y-3">
            {resolved.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onDecision={onDecision}
                busy={busy}
                emergencyStop={emergencyStop}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalCenter;
