import React from "react";

export default function AnalyticsSettings({ data, lang, setLang }) {
  const analytics = data?.analytics || {};
  const trend = analytics?.moisture_trend_7d || [28.5, 27.2, 25.8, 31.0, 29.4, 28.1, 27.9];
  const waterSaved = analytics?.water_saved_percent ?? 22;
  const waterLiters = analytics?.water_saved_liters ?? 14500;
  const completedTasks = analytics?.completed_tasks_count ?? 3;
  const totalTasks = analytics?.total_tasks_count ?? 5;
  const scansCount = analytics?.crop_scans_count ?? (data?.crop_scans?.length || 1);
  const yieldTonnes = analytics?.yield_estimate_tonnes ?? 4.2;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Farm Analytics & Regional Preferences
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            Resource Efficiency & 7-Day Telemetry Trend
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
          LIVE ANALYTICS
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
          <div className="text-[10px] font-bold text-sky-700 uppercase">Water Saved</div>
          <div className="text-base font-black text-sky-900">{waterSaved}%</div>
          <div className="text-[10px] text-sky-600">{waterLiters.toLocaleString()} L</div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Tasks Done</div>
          <div className="text-base font-black text-emerald-900">{completedTasks}/{totalTasks}</div>
          <div className="text-[10px] text-emerald-600">Active Season</div>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
          <div className="text-[10px] font-bold text-purple-700 uppercase">Crop Scans</div>
          <div className="text-base font-black text-purple-900">{scansCount}</div>
          <div className="text-[10px] text-purple-600">Camera + Upload</div>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
          <div className="text-[10px] font-bold text-amber-700 uppercase">Est. Yield</div>
          <div className="text-base font-black text-amber-900">{yieldTonnes} t</div>
          <div className="text-[10px] text-amber-700">AI Forecast</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-extrabold text-slate-700 mb-2">
          7-Day Soil Moisture Trend (% VWC)
        </div>
        <div className="flex items-end gap-2 h-20 pt-2 px-2 bg-slate-50 rounded-xl border border-slate-100">
          {trend.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-600 mb-1">{val}%</span>
              <div
                className="w-full bg-emerald-600 rounded-t-md"
                style={{ height: `${Math.max(12, Math.min(100, val * 1.6))}px` }}
              />
              <span className="text-[9px] text-slate-400 mt-1">D-{6 - i}</span>
            </div>
          ))}
        </div>
      </div>

      {setLang && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-700">Voice & Advisory Language:</span>
          <div className="flex gap-1.5">
            {[
              { code: "en", label: "English" },
              { code: "te", label: "తెలుగు" },
              { code: "hi", label: "हिंदी" }
            ].map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  lang === l.code
                    ? "bg-emerald-700 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

