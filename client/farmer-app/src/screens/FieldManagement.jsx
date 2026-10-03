import React, { useState } from 'react';

export function FieldManagement({
  dashboard,
  selectedFarmerId = 1,
  selectedFieldId = 1,
  onSelectField,
  lang = 'te',
  apiBase = 'http://localhost:8000/api/v1',
  onRefresh,
}) {
  const fields = dashboard?.fields || [];
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [area, setArea] = useState('1.5');
  const [crop, setCrop] = useState(dashboard?.farmer_profile?.crop_variety || 'Chilli (Teja)');
  const [saving, setSaving] = useState(false);

  const addField = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch(`${apiBase}/farmers/${selectedFarmerId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          area_acres: parseFloat(area) || 1.5,
          soil_type: 'Black Cotton Soil',
          irrigation_type: 'Solar Drip + Smart Valve',
          crop,
        }),
      });
      setName('');
      setShowAdd(false);
      if (onRefresh) await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-emerald-400">
          🗺️ {lang === 'te' ? 'పొలం & బ్లాక్ నిర్వహణ (Fields & Plots)' : lang === 'hi' ? 'खेत और प्लॉट प्रबंधन (Fields)' : 'Field & Plot Management'}
        </span>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold"
        >
          {showAdd ? '✕ Close' : '+ Add Field'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addField} className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-2">
          <div className="font-bold text-white">Add New Field / Plot</div>
          <input
            type="text"
            placeholder="Field Name (e.g. Field B — East Block)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="Area (Acres)"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white"
            />
            <input
              type="text"
              placeholder="Crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-lg bg-emerald-500 text-slate-950 font-black"
          >
            {saving ? 'Saving...' : 'Save Field to Database'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {fields.map((f) => {
          const active = Number(f.id) === Number(selectedFieldId);
          return (
            <div
              key={f.id}
              onClick={() => onSelectField && onSelectField(f.id)}
              className={`rounded-xl p-3 border cursor-pointer transition flex items-center justify-between ${
                active
                  ? 'bg-emerald-950/50 border-emerald-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="font-extrabold text-white">
                  {lang === 'te' ? f.name_te || f.name : lang === 'hi' ? f.name_hi || f.name : f.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {f.area_acres} Acres · {f.soil_type} · {f.irrigation_type}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold">
                {f.crop}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FieldManagement;

