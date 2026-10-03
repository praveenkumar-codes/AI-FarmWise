import React from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export function Sidebar({ activeTab, onSelectTab, onOpenAssistant, pendingCount = 0 }) {
  const { t } = useLanguage();

  const items = [
    { id: 'dashboard', label: t.nav.dashboard },
    { id: 'approvals', label: t.nav.approvals, badge: pendingCount },
    { id: 'monitoring', label: t.nav.monitoring },
    { id: 'admin', label: t.nav.admin },
  ];

  return (
    <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 p-4 flex md:flex-col gap-2">
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              active
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      {onOpenAssistant && (
        <button
          type="button"
          onClick={onOpenAssistant}
          className="w-full mt-2 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/40 transition"
        >
          <span>✦ {t.nav.assistant || 'AI Assistant'}</span>
        </button>
      )}
    </aside>
  );
}

export default Sidebar;
