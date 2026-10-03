import React, { useState } from "react";

export function RoverMonitoring({ data, dashboard, farmerId, selectedFarmerId, onRefresh, apiBase }) {
  const API_BASE = apiBase || "http://localhost:8000/api/v1";
  const d = data || dashboard || {};
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [roverAvailable, setRoverAvailable] = useState(true);

  const missions = (data?.robot_missions || []).filter((m) => m.robot_type === "ROVER");
  const activeRover = missions[0] || {
    id: 2,
    mission_code: "SIM-RVR-F1-01",
    state: "SURVEYING",
    battery_percent: 91,
    progress_percent: 50,
    images_captured: 6,
    findings_summary: "Root-zone EC & pH probe nominal; no basal stem rot detected.",
    source_label: "SIMULATED ROVER"
  };

  const requestSoilSample = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/capabilities/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_id: farmerId || data?.farmer?.id || 1,
          capability: "rover_soil_sample",
          zone: "Root Zone Row 4",
          reason: "Automated soil core & basal stem inspection"
        })
      });
      const json = await res.json();
      setMsg(
        json.fallback_used
          ? `Rover unavailable → Fallback created manual Farmer Task (${json.tool_used})`
          : `Dispatched ${json.source_label || "SIMULATED ROVER"} (${json.mission_code || "OK"})`
      );
      if (onRefresh) onRefresh();
    } catch (e) {
      setMsg("Failed to dispatch rover capability.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRoverAvailability = async () => {
    const next = !roverAvailable;
    setRoverAvailable(next);
    try {
      await fetch(`${API_BASE}/capabilities/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_id: farmerId || data?.farmer?.id || 1,
          rover_available: next
        })
      });
      setMsg(
        next
          ? "Simulated Ground Rover marked AVAILABLE."
          : "Simulated Ground Rover marked UNAVAILABLE — next request will fallback to FarmerTaskTool."
      );
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-teal-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
            Ground Robot Soil & Stem Unit
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            Rover {activeRover.mission_code} · {activeRover.state}
          </h3>
        </div>
        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-300">
          SIMULATED ROVER
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 my-3 text-center">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Battery</div>
          <div className="text-sm font-black text-slate-800">{activeRover.battery_percent}%</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Route Progress</div>
          <div className="text-sm font-black text-teal-700">{activeRover.progress_percent}%</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Soil Cores</div>
          <div className="text-sm font-black text-slate-800">{activeRover.images_captured}</div>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 text-xs text-slate-700 mb-3">
        <span className="font-bold text-teal-950">Telemetry Summary: </span>
        {activeRover.findings_summary}
      </div>

      {msg && (
        <div className="p-2 mb-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={requestSoilSample}
          disabled={busy}
          className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
        >
          Request Rover Soil Sample
        </button>
        <button
          onClick={toggleRoverAvailability}
          className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold"
        >
          {roverAvailable ? "Simulate Rover Offline (Test Fallback)" : "Restore Rover Online"}
        </button>
      </div>
    </div>
  );
}
