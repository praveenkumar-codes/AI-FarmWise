import React, { useState } from "react";

export function DroneMonitoring({ data, dashboard, lang, farmerId, selectedFarmerId, onRefresh, apiBase }) {
  const API_BASE = apiBase || "http://localhost:8000/api/v1";
  const d = data || dashboard || {};
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [droneAvailable, setDroneAvailable] = useState(true);

  const missions = (data?.robot_missions || []).filter((m) => m.robot_type === "DRONE");
  const activeMission = missions[0] || {
    id: 1,
    mission_code: "SIM-DRN-F1-01",
    state: "SURVEYING",
    battery_percent: 84,
    progress_percent: 65,
    images_captured: 18,
    findings_summary: "Canopy NDVI uniform across 85% of plot; mild moisture stress in NE quadrant.",
    source_label: "SIMULATED DRONE"
  };

  const STATES = [
    "MISSION_CREATED",
    "PLANNED",
    "TAKEOFF",
    "SURVEYING",
    "IMAGE_CAPTURE",
    "ANALYZING",
    "RETURNING",
    "COMPLETED"
  ];

  const handleDispatch = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE}/capabilities/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_id: farmerId || data?.farmer?.id || 1,
          capability: "drone_inspection",
          zone: "North-East Plot",
          reason: "Multispectral canopy & pest hotspot scouting"
        })
      });
      const json = await res.json();
      setStatusMsg(
        json.fallback_used
          ? `Drone unavailable → Fallback triggered: Created Farmer Task (${json.tool_used})`
          : `Dispatched ${json.source_label || "SIMULATED DRONE"} mission (${json.mission_code || "OK"})`
      );
      if (onRefresh) onRefresh();
    } catch (e) {
      setStatusMsg("Could not reach capability registry.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceState = async () => {
    if (!activeMission?.id) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE}/capabilities/missions/${activeMission.id}/advance`, {
        method: "POST"
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAvailability = async () => {
    const nextVal = !droneAvailable;
    setDroneAvailable(nextVal);
    try {
      await fetch(`${API_BASE}/capabilities/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_id: farmerId || data?.farmer?.id || 1,
          drone_available: nextVal
        })
      });
      setStatusMsg(
        nextVal
          ? "Simulated Drone marked AVAILABLE."
          : "Simulated Drone marked UNAVAILABLE — next dispatch will auto-fallback to FarmerTaskTool."
      );
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            Aerial Canopy Scouting
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            Mission {activeMission.mission_code} · {activeMission.state}
          </h3>
        </div>
        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-300">
          SIMULATED DRONE
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 my-3 text-center">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Battery</div>
          <div className="text-sm font-black text-slate-800">{activeMission.battery_percent}%</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Progress</div>
          <div className="text-sm font-black text-indigo-700">{activeMission.progress_percent}%</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Frames</div>
          <div className="text-sm font-black text-slate-800">{activeMission.images_captured}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {STATES.map((st) => {
          const isCurrent = st === activeMission.state;
          return (
            <span
              key={st}
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                isCurrent
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {st}
            </span>
          );
        })}
      </div>

      <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-700 mb-3">
        <span className="font-bold text-indigo-950">Simulated Findings: </span>
        {activeMission.findings_summary}
      </div>

      {statusMsg && (
        <div className="p-2 mb-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold">
          {statusMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleDispatch}
          disabled={busy}
          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
        >
          Dispatch Drone Inspection
        </button>
        <button
          onClick={handleAdvanceState}
          disabled={busy}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
        >
          Advance Mission State →
        </button>
        <button
          onClick={handleToggleAvailability}
          className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold"
        >
          {droneAvailable ? "Simulate Drone Offline (Test Fallback)" : "Restore Drone Online"}
        </button>
      </div>
    </div>
  );
}
