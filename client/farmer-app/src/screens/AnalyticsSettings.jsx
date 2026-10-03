import React, { useState, useEffect } from "react";

export default function AnalyticsSettings({ data, lang, setLang, apiBase, farmerId = 1 }) {
  const [report, setReport] = useState(null);
  const resolvedApi =
    apiBase ||
    (typeof window !== "undefined" && window.location.hostname
      ? `http://${window.location.hostname}:8000/api/v1`
      : "http://localhost:8000/api/v1");

  useEffect(() => {
    let active = true;
    fetch(`${resolvedApi}/reports/farmers/${farmerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (active && res) setReport(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [resolvedApi, farmerId]);

  const analytics = data?.analytics || {};
  const trend = analytics?.moisture_trend_7d || [28.5, 27.2, 25.8, 31.0, 29.4, 28.1, 27.9];

  const currentCrop =
    report?.current_crops?.[0]?.crop || data?.crop_cycles?.[0]?.crop_name || "Rice (BPT-5204)";
  const cropStage =
    report?.current_crops?.[0]?.current_stage || data?.crop_cycles?.[0]?.current_stage || "Vegetative";
  const soilMoisture =
    report?.soil_condition?.current_moisture_vwc ?? data?.soil_moisture ?? 18.5;
  const threshold =
    report?.soil_condition?.critical_threshold_vwc ?? 30.0;
  const soilStatusText =
    soilMoisture < threshold ? `Needs Water (${soilMoisture}%)` : `Good (${soilMoisture}%)`;
  const tempC = report?.weather_condition?.temperature_c ?? data?.weather?.temperature ?? 31.0;
  const rainProb =
    report?.weather_condition?.rain_probability_6h_pct ?? data?.weather?.precip_prob ?? 10;
  const irrigationStatus =
    report?.my_farm_summary?.irrigation_status ||
    (soilMoisture < threshold ? "Attention Required" : "Optimal");
  const cropHealthStatus =
    report?.my_farm_summary?.crop_health_status ||
    report?.crop_health_scans?.[0]?.health_status ||
    "Good";
  const openTasksCount =
    report?.open_tasks?.length ?? (data?.tasks || []).filter((t) => t.status !== "COMPLETED").length;
  const doneTasksCount =
    report?.completed_tasks?.length ??
    (data?.tasks || []).filter((t) => t.status === "COMPLETED").length;
  const activeAlertsCount =
    report?.my_farm_summary?.active_alerts_count ?? (data?.alerts || []).length;

  const whatHappened =
    report?.my_farm_summary?.what_happened ||
    `Soil moisture in your ${currentCrop} field is ${soilMoisture}% and rain chance over the next 6 hours is ${rainProb}%.`;
  const whatShouldIDo =
    report?.my_farm_summary?.what_should_i_do ||
    data?.advisory?.title ||
    "Review and approve today's recommended irrigation.";
  const whyText =
    report?.my_farm_summary?.why ||
    data?.advisory?.why ||
    `Your ${currentCrop} crop is in the ${cropStage} stage and needs at least ${threshold}% moisture for healthy growth.`;

  const recentRecs = report?.ai_recommendations || data?.actions || [];

  return (
    <div className="bg-slate-900 rounded-3xl p-4 shadow-lg border border-slate-800 space-y-4 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            📋 My Farm Summary & Report
          </span>
          <h3 className="text-base font-black text-white mt-1">
            {lang === "te"
              ? "నా వ్యవసాయ నివేదిక (My Farm Summary)"
              : lang === "hi"
              ? "मेरी खेत रिपोर्ट (My Farm Summary)"
              : "My Farm Summary & Seasonal Report"}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => window.open(`${resolvedApi}/reports/export?format=csv&farmer_id=${farmerId}`, "_blank")}
          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow"
        >
          ⬇ CSV
        </button>
      </div>

      {/* Farmer-Friendly Explainable Card: What happened? What should I do? Why? */}
      <div className="rounded-2xl bg-slate-950 border border-emerald-500/30 p-3.5 space-y-2.5 text-xs">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
            What happened?
          </div>
          <div className="text-slate-100 font-bold mt-0.5">{whatHappened}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
            What should I do?
          </div>
          <div className="text-white font-black mt-0.5">{whatShouldIDo}</div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
            Why?
          </div>
          <div className="text-slate-300 mt-0.5">{whyText}</div>
        </div>
      </div>

      {/* 8 Farmer Summary Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Current Crop</div>
          <div className="font-black text-emerald-300 mt-0.5 truncate">{currentCrop}</div>
          <div className="text-[10px] text-slate-400">Stage: {cropStage}</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Soil Condition</div>
          <div className={`font-black mt-0.5 ${soilMoisture < threshold ? "text-amber-300" : "text-emerald-300"}`}>
            {soilStatusText}
          </div>
          <div className="text-[10px] text-slate-400">Target: {threshold}%+</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Weather</div>
          <div className="font-black text-cyan-300 mt-0.5">{tempC}°C</div>
          <div className="text-[10px] text-slate-400">Rain Chance: {rainProb}%</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Irrigation Status</div>
          <div className="font-black text-teal-300 mt-0.5">{irrigationStatus}</div>
          <div className="text-[10px] text-slate-400">Crop Health: {cropHealthStatus}</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">My Tasks</div>
          <div className="font-black text-white mt-0.5">{openTasksCount} To Do</div>
          <div className="text-[10px] text-emerald-400">{doneTasksCount} Completed</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Farm Alerts</div>
          <div className="font-black text-amber-300 mt-0.5">{activeAlertsCount} Active</div>
          <div className="text-[10px] text-slate-400">Weather & Soil</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 col-span-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Recent AI Recommendations</div>
          <div className="font-bold text-slate-200 mt-0.5 truncate">
            {recentRecs[0]?.title || whatShouldIDo}
          </div>
          <div className="text-[10px] text-emerald-400">
            Status: {recentRecs[0]?.status || "Active Advisory"}
          </div>
        </div>
      </div>

      {/* 7-Day Soil Moisture Trend */}
      <div>
        <div className="text-xs font-extrabold text-slate-300 mb-2">
          Recent Soil Moisture Trend (% VWC)
        </div>
        <div className="flex items-end gap-2 h-20 pt-2 px-2 bg-slate-950 rounded-2xl border border-slate-800">
          {trend.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-300 mb-1">{val}%</span>
              <div
                className="w-full bg-emerald-500 rounded-t-md"
                style={{ height: `${Math.max(12, Math.min(100, val * 1.4))}px` }}
              />
              <span className="text-[9px] text-slate-500 mt-1">D-{6 - i}</span>
            </div>
          ))}
        </div>
      </div>

      {setLang && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span className="font-bold text-slate-300">App Language:</span>
          <div className="flex gap-1.5">
            {[
              { code: "en", label: "English" },
              { code: "te", label: "తెలుగు" },
              { code: "hi", label: "हिंदी" },
            ].map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  lang === l.code
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-300"
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
