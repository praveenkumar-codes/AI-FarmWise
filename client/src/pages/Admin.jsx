import React from 'react';

export function AdminPage({ dashboard }) {
  const logs = dashboard?.audit_logs || [];

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-100">
          Safety Interlock & Immutable Audit Log
        </h2>
        <p className="text-xs text-slate-400">
          Every AI proposal, human approval/rejection, MAVLink dispatch, and Emergency Stop event is recorded.
        </p>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="text-xs text-slate-400 py-4">No audit records yet.</div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl bg-slate-950/70 border border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-emerald-400">{entry.event}</span>
                {entry.action_id && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">
                    {entry.action_id}
                  </span>
                )}
                <span className="text-slate-400">by {entry.actor}</span>
              </div>
              <span className="font-mono text-slate-400">{entry.created_at}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminPage;
