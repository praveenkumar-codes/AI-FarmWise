import React, { useState } from 'react';

export function FarmActivities({
  dashboard,
  selectedFarmerId = 1,
  lang = 'te',
  apiBase = 'http://localhost:8000/api/v1',
  onRefresh,
}) {
  const tasks = dashboard?.tasks || [];
  const activities = dashboard?.farm_activities || [];
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [busyId, setBusyId] = useState(null);

  const toggleTaskStatus = async (task) => {
    setBusyId(task.id);
    const nextStatus =
      task.status === 'TODO'
        ? 'IN_PROGRESS'
        : task.status === 'IN_PROGRESS'
        ? 'COMPLETED'
        : 'TODO';
    try {
      await fetch(`${apiBase}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (onRefresh) await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setBusyId('new');
    try {
      await fetch(`${apiBase}/farmers/${selectedFarmerId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          category: 'FARMER_TASK',
          priority: 'MEDIUM',
          due_date: 'Today',
        }),
      });
      setNewTaskTitle('');
      if (onRefresh) await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-amber-400">
          ✅ {lang === 'te' ? 'పొలం పనులు & టాస్క్‌లు (Farm Tasks)' : lang === 'hi' ? 'खेत के कार्य और टास्क (Farm Tasks)' : 'Agent-Generated Tasks & Field Activities'}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold">
          {tasks.filter((t) => t.status === 'COMPLETED').length}/{tasks.length} Done
        </span>
      </div>

      {/* Task List with 1-Tap Status Progression (TODO -> IN_PROGRESS -> COMPLETED) */}
      <div className="space-y-2">
        {tasks.map((t) => {
          const title = lang === 'te' ? t.title_te || t.title : lang === 'hi' ? t.title_hi || t.title : t.title;
          return (
            <div
              key={t.id}
              className="rounded-xl bg-slate-950 p-3 border border-slate-800 flex items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className={`font-bold ${t.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-white'}`}>
                  {title}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  <span className="font-mono text-cyan-300">{t.assigned_tool}</span>
                  <span>· Due: {t.due_date}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={busyId === t.id}
                onClick={() => toggleTaskStatus(t)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black shrink-0 transition ${
                  t.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : t.status === 'IN_PROGRESS'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                }`}
              >
                {t.status}
              </button>
            </div>
          );
        })}
      </div>

      <form onSubmit={addTask} className="flex gap-2 pt-1">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder={lang === 'te' ? 'కొత్త పనిని జోడించండి...' : 'Add a farm task...'}
          className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
        />
        <button
          type="submit"
          disabled={busyId === 'new'}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black"
        >
          + Add
        </button>
      </form>

      {activities.length > 0 && (
        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400">Recent Completed Field Activities</div>
          {activities.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center justify-between text-[11px] text-slate-300">
              <span>• {a.title}</span>
              <span className="font-mono text-emerald-400">₹{a.cost_inr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FarmActivities;

