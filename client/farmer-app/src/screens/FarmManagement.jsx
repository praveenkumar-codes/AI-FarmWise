import React from 'react';

export function FarmManagement({ dashboard, lang = 'te' }) {
  const farm = dashboard?.farm || {};
  const p = dashboard?.farmer_profile || {};
  const fields = dashboard?.fields || [];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-emerald-400">
          🏡 {lang === 'te' ? 'వ్యవసాయ క్షేత్ర వివరాలు (Farm Overview)' : lang === 'hi' ? 'फार्म प्रबंधन (Farm Overview)' : 'Farm Overview & Infrastructure'}
        </span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
          {fields.length || 1} Active Plots
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Farm Name</div>
          <div className="font-bold text-white mt-0.5">{farm.name || `${p.farmer_name} Farm`}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Total Cultivated Area</div>
          <div className="font-bold text-emerald-300 mt-0.5">{p.area_acres || 3.5} Acres</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Assigned Fleet Asset</div>
          <div className="font-bold text-sky-300 mt-0.5">{p.fleet_unit || 'Smart Solenoid Valve'}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Safety Interlock</div>
          <div className={`font-bold mt-0.5 ${farm.emergency_stop ? 'text-rose-400' : 'text-emerald-400'}`}>
            {farm.emergency_stop ? '🛑 EMERGENCY STOP' : '🟢 Normal Armed'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FarmManagement;

