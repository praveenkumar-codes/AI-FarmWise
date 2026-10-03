import React, { useState } from 'react';

export function FarmerProfile({
  dashboard,
  selectedFarmerId = 1,
  lang = 'te',
  onSetLang,
  apiBase = 'http://localhost:8000/api/v1',
  onRefresh,
}) {
  const p = dashboard?.farmer_profile || {};
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState(p.growth_stage || 'Vegetative');
  const [saving, setSaving] = useState(false);

  const saveStage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${apiBase}/farmers/${selectedFarmerId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ growth_stage: stage, preferred_language: lang }),
      });
      setEditing(false);
      if (onRefresh) await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const name =
    lang === 'te'
      ? p.farmer_name_te || p.farmer_name
      : lang === 'hi'
      ? p.farmer_name_hi || p.farmer_name
      : p.farmer_name;
  const village =
    lang === 'te' ? p.village_te || p.village : lang === 'hi' ? p.village_hi || p.village : p.village;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-emerald-400">
          👨‍🌾 {lang === 'te' ? 'రైతు ప్రొఫైల్ (Farmer Profile)' : lang === 'hi' ? 'किसान प्रोफ़ाइल (Farmer Profile)' : 'Farmer Profile & Identity'}
        </span>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold"
        >
          {editing ? 'Cancel' : lang === 'te' ? '✏️ సవరించు' : '✏️ Edit Stage'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Farmer Name</div>
          <div className="font-extrabold text-white mt-0.5">{name || 'Ramesh Kumar'}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Village / Location</div>
          <div className="font-extrabold text-white mt-0.5">{village || 'Kankipadu'}, AP</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Primary Crop</div>
          <div className="font-extrabold text-emerald-300 mt-0.5">{p.crop_variety || 'Rice'}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <div className="text-slate-400">Growth Stage</div>
          <div className="font-extrabold text-amber-300 mt-0.5">{p.growth_stage || 'Vegetative'}</div>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveStage} className="flex items-center gap-2 pt-1">
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-bold"
          >
            {['Sowing', 'Vegetative', 'Flowering', 'Pod Development', 'Harvest'].map((s) => (
              <option key={s} value={s}>
                Stage: {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black"
          >
            {saving ? '...' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}

export default FarmerProfile;

