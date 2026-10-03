import React from "react";

export default function FarmHistory({ data }) {
  const cycles = data?.crop_cycles || [];
  const proposals = data?.proposals || [];
  const scans = data?.crop_scans || [];
  const activities = data?.farm_activities || [];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
            Historical Farm Records & Audit Trail
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            Past Crop Cycles, Decisions & Scans
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
          HISTORICAL DATA
        </span>
      </div>

      <div>
        <div className="text-xs font-extrabold text-slate-800 mb-1.5">
          Crop Cycles ({cycles.length})
        </div>
        <div className="space-y-1.5">
          {cycles.map((c) => (
            <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900">{c.crop_name} ({c.variety || "Standard"})</div>
                <div className="text-slate-500">Sown: {c.sowing_date} · Stage: {c.current_stage}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {c.Yield_tonnes ? `${c.Yield_tonnes}t Harvested` : c.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-extrabold text-slate-800 mb-1.5">
          Recommendation & Approval Ledger ({proposals.length})
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {proposals.slice(0, 6).map((p) => (
            <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-800">{p.action_type} · {p.id}</div>
                <div className="text-slate-500 line-clamp-1">{p.reasoning}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                p.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800"
                  : p.status === "REJECTED"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
          <div className="font-bold text-emerald-900">Saved Leaf Scans</div>
          <div className="text-lg font-black text-emerald-700">{scans.length}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-100">
          <div className="font-bold text-sky-900">Logged Field Activities</div>
          <div className="text-lg font-black text-sky-700">{activities.length}</div>
        </div>
      </div>
    </div>
  );
}

