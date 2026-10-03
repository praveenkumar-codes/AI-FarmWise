import React from 'react';

export function CropManagement({ dashboard, lang = 'te' }) {
  const cycles = dashboard?.crop_cycles || [];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-emerald-400">
          🌾 {lang === 'te' ? 'పంట చక్రాలు & రకాలు (Crop Cycles)' : lang === 'hi' ? 'फसल चक्र और किस्में (Crop Cycles)' : 'Active & Historical Crop Cycles'}
        </span>
        <span className="text-[10px] font-mono text-slate-400">{cycles.length} Cycles</span>
      </div>

      <div className="space-y-2">
        {cycles.map((c) => (
          <div key={c.id} className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white">
                {c.crop} ({c.season})
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  c.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {c.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Stage: <span className="font-bold text-amber-300">{c.current_stage}</span> · Day {c.crop_age_days}/{c.duration_days}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
              <span>Sown: {c.sowing_date}</span>
              <span>Expected Harvest: {c.expected_harvest_date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CropManagement;

