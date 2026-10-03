import React, { useState, useEffect, useCallback } from 'react';
import { AdminReportsView } from './ReportsModule.jsx';

const API_BASE =
  typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:8000/api/v1`
    : 'http://localhost:8000/api/v1';

const FALLBACK_FARMERS = [
  { id: 1, farmer_name: 'Ramesh Kumar', village: 'Kankipadu', crop_variety: 'Rice (BPT-5204)', growth_stage: 'Vegetative', area_acres: 3.5, soil_moisture: 18.5, satellite_moisture: 21.8, status: 'CRITICAL_DEFICIT', sensor_node: 'ESP32-GPIO34-LIVE' },
  { id: 2, farmer_name: 'Suresh Reddy', village: 'Guntur', crop_variety: 'Cotton (Bt-II)', growth_stage: 'Boll Formation', area_acres: 6.0, soil_moisture: 29.4, satellite_moisture: 28.9, status: 'MODERATE_STRESS', sensor_node: 'ESP32-SIM-NODE-02' },
  { id: 3, farmer_name: 'Venkat Rao', village: 'Tenali', crop_variety: 'Chilli (Teja)', growth_stage: 'Vegetative', area_acres: 2.0, soil_moisture: 52.0, satellite_moisture: 49.5, status: 'OPTIMAL', sensor_node: 'ESP32-SIM-NODE-03' },
  { id: 4, farmer_name: 'Priya Sharma', village: 'Vijayawada', crop_variety: 'Maize (DHM-117)', growth_stage: 'Sowing', area_acres: 2.8, soil_moisture: 55.0, satellite_moisture: 51.0, status: 'RAIN_HOLD', sensor_node: 'ESP32-SIM-NODE-04' },
  { id: 5, farmer_name: 'Lakshmi Bai', village: 'Nandyal', crop_variety: 'Groundnut (K-6)', growth_stage: 'Flowering', area_acres: 5.0, soil_moisture: 24.5, satellite_moisture: 25.2, status: 'CRITICAL_DEFICIT', sensor_node: 'ESP32-SIM-NODE-05' },
];

const ADMIN_NAV_ITEMS = [
  { id: 'Dashboard', icon: '🛰️', label: 'Dashboard' },
  { id: 'Farmers', icon: '👨‍🌾', label: 'Farmers' },
  { id: 'Farms', icon: '🏡', label: 'Farms' },
  { id: 'Fields', icon: '🗺️', label: 'Fields' },
  { id: 'Crops', icon: '🌾', label: 'Crops' },
  { id: 'Devices', icon: '🔌', label: 'Devices' },
  { id: 'Agents', icon: '🤖', label: 'Agents' },
  { id: 'Recommendations', icon: '💡', label: 'Recommendations' },
  { id: 'Alerts', icon: '⚠️', label: 'Alerts' },
  { id: 'Tasks', icon: '✅', label: 'Tasks' },
  { id: 'Reports', icon: '📊', label: 'Reports' },
  { id: 'Audit Trail', icon: '📜', label: 'Audit Trail' },
];

export function App() {
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [farmers, setFarmers] = useState(FALLBACK_FARMERS);
  const [selectedFarmerId, setSelectedFarmerId] = useState(1);
  const [dashboard, setDashboard] = useState(null);
  const [agentRuns, setAgentRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [customGoal, setCustomGoal] = useState('Should I irrigate Field A today?');
  const [droneOfflineSim, setDroneOfflineSim] = useState(false);
  const [lang, setLang] = useState('en');
  const [busy, setBusy] = useState(false);
  const [serialLogs, setSerialLogs] = useState([]);
  const [protocolLogs, setProtocolLogs] = useState([
    {
      ts: new Date().toLocaleTimeString(),
      proto: 'MAVLINK_2.0_UDP:14550',
      msg: 'SET_POSITION_TARGET_GLOBAL_INT {lat_int: 164419000, lon_int: 807639000, alt: 15.0, type_mask: 0b0000111111111000}',
      ack: 'MAV-86D08306 (COMMAND_ACK: ACCEPTED)',
    },
    {
      ts: new Date().toLocaleTimeString(),
      proto: 'MQTT_BROKER:1883',
      msg: 'TOPIC farmwise/rover/actuate PAYLOAD {"unit":"ROVER-02","valve":"OPEN","flow_lpm":42.5,"duration_min":35}',
      ack: 'QoS 1 PUBACK',
    },
  ]);

  const fetchAll = useCallback(async () => {
    try {
      const [fRes, dRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/farmers`),
        fetch(`${API_BASE}/farmers/${selectedFarmerId}/dashboard?lang=${lang}`),
        fetch(`${API_BASE}/agent/runs?farmer_id=${selectedFarmerId}&limit=10`),
      ]);
      if (fRes.ok) {
        const fData = await fRes.json();
        const list = Array.isArray(fData) ? fData : fData.farmers || [];
        if (list.length > 0) setFarmers(list);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDashboard(dData);
        const moisture = Number(dData?.soil_moisture ?? dData?.telemetry?.soil_moisture ?? 18.5);
        const adc = dData?.telemetry?.adc_raw ?? Math.round(4095 - (moisture / 100) * 2495);
        const voltage = dData?.telemetry?.voltage ?? Number(((adc / 4095) * 3.3).toFixed(2));
        const serialLine = JSON.stringify({
          ts: new Date().toISOString().slice(11, 19),
          device_id: dData?.telemetry?.device_id || 'ESP32-FIELD-01',
          gpio: 34,
          adc_raw: adc,
          voltage_v: voltage,
          soil_moisture_vwc: moisture,
          ecmwf_sat_vwc: dData?.satellite_soil_moisture ?? 22.4,
        });
        setSerialLogs((prev) => [serialLine, ...prev].slice(0, 14));
      }
      if (rRes.ok) {
        const runs = await rRes.json();
        setAgentRuns(runs);
        setActiveRun((prev) => {
          if (!runs.length) return prev;
          if (!prev) return runs[0];
          const updated = runs.find((r) => r.run_id === prev.run_id || r.id === prev.id);
          return updated || runs[0];
        });
      }
    } catch (_) {
      // keep previous state if offline
    }
  }, [selectedFarmerId, lang]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 3000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const runAgentScenario = async (goalText, scenarioName, extraParams = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: selectedFarmerId,
          farm_id: selectedFarmerId,
          field_id: 1,
          goal: goalText,
          scenario: scenarioName,
          lang,
          ...extraParams,
        }),
      });
      if (res.ok) {
        const runOut = await res.json();
        setActiveRun(runOut);
      }
      await fetchAll();
    } finally {
      setBusy(false);
    }
  };

  const verifyClosedLoopOutcome = async (simulatedPostMoisture) => {
    if (!activeRun?.run_id) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/agent/runs/${activeRun.run_id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_soil_moisture: simulatedPostMoisture }),
      });
      if (res.ok) {
        const verifiedRun = await res.json();
        setActiveRun(verifiedRun);
      }
      await fetchAll();
    } finally {
      setBusy(false);
    }
  };

  const simulateSoil = async (moistureVal) => {
    setBusy(true);
    try {
      const adcRaw = Math.round(4095 - (moistureVal / 100) * 2495);
      const voltage = Number(((adcRaw / 4095) * 3.3).toFixed(2));
      await fetch(`${API_BASE}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'esp32_zone_01',
          soil_moisture: moistureVal,
          adc_raw: adcRaw,
          voltage,
          source: 'ADMIN_DIAGNOSTIC_INJECTION',
        }),
      });
      await fetchAll();
    } finally {
      setBusy(false);
    }
  };

  const triggerEmergencyStop = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/devices/emergency-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true, reason: 'Admin Command Center Global Halt' }),
      });
      const data = await res.json();
      setProtocolLogs((prev) => [
        {
          ts: new Date().toLocaleTimeString(),
          proto: 'MAVLINK_2.0_UDP:14550',
          msg: 'MAV_CMD_NAV_RETURN_TO_LAUNCH + SOLENOID_CUTOFF_ALL',
          ack: `${data.aborted_actions ?? 0} Dispatches Halted`,
        },
        ...prev,
      ]);
      await fetchAll();
    } finally {
      setBusy(false);
    }
  };

  const handleDecision = async (farmerId, proposalId, decision) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/farmers/${farmerId}/actions/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: String(proposalId || 'ACT_001'),
          status: decision,
          actor: 'admin',
        }),
      });
      const data = await res.json();
      if (decision === 'APPROVED') {
        setProtocolLogs((prev) => [
          {
            ts: new Date().toLocaleTimeString(),
            proto: 'MAVLINK_2.0_UDP:14550',
            msg: `SET_POSITION_TARGET_GLOBAL_INT {farmer_id: ${farmerId}, action_id: ${proposalId}, alt: 12.0}`,
            ack: `${data.execution_ref || data.command_id || 'MAV-ACK'} (DISPATCHED)`,
          },
          ...prev,
        ]);
      }
      await fetchAll();
    } finally {
      setBusy(false);
    }
  };

  const espMoisture = Number(dashboard?.soil_moisture ?? dashboard?.telemetry?.soil_moisture ?? 18.5);
  const satMoisture = Number(dashboard?.satellite_soil_moisture ?? 22.4);
  const adcRaw = dashboard?.telemetry?.adc_raw ?? Math.round(4095 - (espMoisture / 100) * 2495);
  const voltage = dashboard?.telemetry?.voltage ?? Number(((adcRaw / 4095) * 3.3).toFixed(2));
  const fusionStatus =
    dashboard?.fusion_status ||
    (espMoisture < 30 && satMoisture < 30 ? 'VERIFIED_CRITICAL_DEFICIT' : 'VERIFIED_NOMINAL');
  const fusionConfidence = dashboard?.fusion_confidence ?? 98;
  const actions = dashboard?.actions || dashboard?.proposals || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-5 space-y-5">
      {/* Top Operations Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
              PORT 5174 · ADMIN & AGENTIC TRACE OPS
            </span>
            <h1 className="text-xl font-black tracking-tight text-white">
              🛰️ AI FarmWise — Agentic AI Command Center & Live Trace
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            GOAL → OBSERVE MEMORY → PLAN → DYNAMIC TOOL SELECTION → EXECUTE → EVALUATE → REPLAN → HITL → ACT → VERIFY → MEMORY
          </p>
        </div>

        {/* Diagnostic Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => simulateSoil(18.5)}
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition"
          >
            🔥 Simulate Dry Soil (18.5%)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => simulateSoil(64.0)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition"
          >
            💧 Simulate Wet Soil (64.0%)
          </button>
          <button
            type="button"
            onClick={() => setActiveNav(activeNav === 'Reports' ? 'Dashboard' : 'Reports')}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-cyan-950/60 transition"
          >
            📊 {activeNav === 'Reports' ? 'Back to Command Center' : 'Open Farm Reports'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={triggerEmergencyStop}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-rose-950/60 transition"
          >
            🛑 GLOBAL EMERGENCY STOP
          </button>
        </div>
      </header>

      {/* Admin Sidebar / Module Navigation Bar (All 12 Sections) */}
      <nav
        aria-label="Admin Sidebar Navigation"
        className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center gap-1.5 shadow-lg"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const isAct = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                isAct
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {activeNav === 'Reports' ? (
        <AdminReportsView
          apiBase={API_BASE}
          farmers={farmers}
          selectedFarmerId={selectedFarmerId}
          setSelectedFarmerId={setSelectedFarmerId}
        />
      ) : (
        <>
      {/* Requirement 28: AGENTIC DEMO CONTROL BAR */}
      <section className="bg-slate-900 border border-violet-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase text-violet-300 bg-violet-950/80 px-2.5 py-0.5 rounded border border-violet-500/30">
              LIVE AGENTIC SCENARIO CONTROLLER (FARMER #{selectedFarmerId})
            </span>
            <h2 className="text-sm font-black text-white mt-1">
              Trigger Real Backend FarmManagerAgent Runs (Dynamic Tool Selection + Replanning + Closed-Loop Verification)
            </h2>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/30 cursor-pointer">
            <input
              type="checkbox"
              checked={droneOfflineSim}
              onChange={(e) => setDroneOfflineSim(e.target.checked)}
              className="accent-amber-400"
            />
            Simulate Drone Offline (Trigger Replan to FarmerTaskTool)
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAgentScenario('Should I irrigate Field A?', 'IRRIGATION', {
                override_soil_moisture: 18.5,
                override_rain_prob: 5,
              })
            }
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow"
          >
            ▶ Run Irrigation Scenario
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAgentScenario('Check why my crop is unhealthy', 'CROP_STRESS')
            }
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow"
          >
            ▶ Run Crop Health Scenario
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAgentScenario('Inspect Field B', 'DRONE_INSPECTION', {
                simulate_drone_unavailable: droneOfflineSim,
              })
            }
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow"
          >
            ▶ Run Drone Scenario {droneOfflineSim ? '(Offline -> Replan)' : '(Drone Available)'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAgentScenario(
                'ESP32 sensor offline — evaluate Field A moisture using fallback',
                'SENSOR_FAILURE',
                { simulate_esp32_offline: true }
              )
            }
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow"
          >
            ▶ Run Sensor Failure Scenario
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAgentScenario('When should I harvest?', 'HARVEST')
            }
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow"
          >
            ▶ Run Harvest Scenario
          </button>
        </div>

        {/* Custom Goal Input + Closed-Loop Action Verification Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="Enter any dynamic farm goal for FarmManagerAgent..."
            className="flex-1 min-w-[260px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => runAgentScenario(customGoal, null)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black"
          >
            🚀 Submit Goal to FarmManagerAgent
          </button>
          <button
            type="button"
            disabled={busy || !activeRun}
            onClick={() => verifyClosedLoopOutcome(39.0)}
            className="px-3.5 py-2 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/40 text-xs font-bold"
          >
            ✓ Verify Action Success (Moisture → 39%)
          </button>
          <button
            type="button"
            disabled={busy || !activeRun}
            onClick={() => verifyClosedLoopOutcome(18.0)}
            className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-bold"
          >
            ⚠ Simulate Action Verification Failure (Replan)
          </button>
        </div>
      </section>

      {/* Requirement 26 & 31: LIVE AGENT TRACE INSPECTOR */}
      {activeRun && (
        <section className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-500/40">
                  Agent Run #{activeRun.numeric_id || activeRun.id} ({activeRun.run_id})
                </span>
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  STATE: {activeRun.status}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Latency: {activeRun.latency_ms}ms
                </span>
              </div>
              <div className="text-sm font-black text-white mt-1.5">
                Goal: &ldquo;{activeRun.goal}&rdquo;
              </div>
            </div>

            {agentRuns.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Inspect Run History:</span>
                <select
                  value={activeRun.run_id}
                  onChange={(e) => {
                    const found = agentRuns.find((r) => r.run_id === e.target.value);
                    if (found) setActiveRun(found);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-cyan-300 font-mono text-xs"
                >
                  {agentRuns.map((r) => (
                    <option key={r.run_id} value={r.run_id}>
                      #{r.numeric_id || r.id} · {r.goal.slice(0, 32)} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* State Machine Transition Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(activeRun.state_history || []).map((sh, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
              >
                {idx + 1}. {sh.state}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* Column 1: What did the agents plan & which tools did they select dynamically? */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="font-black uppercase text-violet-400">
                1. Dynamic Plan & Selected Tools ({activeRun.plan?.planner_mode || 'PLANNER'})
              </div>
              <div className="text-[11px] text-slate-400">
                Goal Type: <span className="text-white font-bold">{activeRun.plan?.goal_type}</span> ·
                Tools Executed: <span className="text-emerald-300 font-mono">{(activeRun.tools_used || []).join(' → ')}</span>
              </div>
              <div className="space-y-1.5">
                {(activeRun.plan?.steps || []).map((st, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-cyan-300">{st.tool}</span>
                      <div className="text-[11px] text-slate-400">{st.reason}</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">✓</span>
                  </div>
                ))}
              </div>
              {(activeRun.replans || []).length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-200 space-y-1">
                  <div className="font-black uppercase text-[10px] text-amber-300">
                    ⚡ Dynamic Replanning Triggered
                  </div>
                  {activeRun.replans.map((rp, idx) => (
                    <div key={idx} className="text-[11px]">
                      <span className="font-mono font-bold">{rp.from_tool} → {rp.to_tool}:</span> {rp.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Live Step-by-Step Backend Trace Events */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 max-h-72 overflow-y-auto">
              <div className="font-black uppercase text-cyan-400">
                2. Live Backend Observation & Execution Trace
              </div>
              {(activeRun.trace_events || []).map((ev, i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800/90 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-300">
                      ✓ {ev.label}
                    </span>
                    {ev.data_source && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                        {ev.data_source}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300">{ev.detail}</div>
                </div>
              ))}
            </div>

            {/* Column 3: Evaluator Verdict, Decision, HITL & Closed-Loop Verification */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="font-black uppercase text-emerald-400">
                3. Evaluator Verdict, HITL & Closed-Loop Verification
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Decision ({activeRun.decision?.primary_data_source})
                </div>
                <div className="font-black text-white text-sm">
                  {activeRun.decision?.recommendation}
                </div>
                <div className="text-[11px] text-slate-300">
                  {activeRun.decision?.reason}
                </div>
                <div className="text-[11px] font-mono text-cyan-300 pt-1">
                  Confidence: {activeRun.decision?.confidence} · Approval Required: {String(activeRun.approval_required)}
                </div>
              </div>

              {activeRun.action_id && (
                <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-indigo-300">
                      LINKED HITL ACTION: {activeRun.action_id}
                    </div>
                    <div className="text-xs font-bold text-white">
                      Status: {activeRun.approval_status}
                    </div>
                  </div>
                  {activeRun.approval_status === 'PENDING_APPROVAL' && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecision(selectedFarmerId, activeRun.action_id, 'APPROVED')}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecision(selectedFarmerId, activeRun.action_id, 'REJECTED')}
                        className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeRun.result && Object.keys(activeRun.result).length > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-emerald-300">
                    Closed-Loop Outcome & Memory Update
                  </div>
                  <div className="text-[11px] text-slate-200">
                    {activeRun.result.summary || `Execution: ${activeRun.result.execution_status} (${activeRun.result.verification_status})`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 1. Regional Fleet Table (All 5 Demo Farmers) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-cyan-400">
            1. Regional Multi-Farmer Priority Risk Matrix (5 Demo Farms)
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Explainability Lang:</span>
            {['en', 'te', 'hi'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded font-bold uppercase ${
                  lang === l ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase">
                <th className="py-2.5 px-3">Farmer</th>
                <th className="py-2.5 px-3">Village</th>
                <th className="py-2.5 px-3">Crop & Stage</th>
                <th className="py-2.5 px-3">Area</th>
                <th className="py-2.5 px-3">ESP32 VWC</th>
                <th className="py-2.5 px-3">ECMWF Sat (3-9cm)</th>
                <th className="py-2.5 px-3">Fusion Status</th>
                <th className="py-2.5 px-3">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {farmers.map((f) => {
                const isSelected = Number(f.id) === Number(selectedFarmerId);
                const m = Number(f.soil_moisture ?? 25.0);
                const sat = Number(f.satellite_moisture ?? 24.5);
                const risk =
                  f.status ||
                  (m < 25 ? 'CRITICAL_DEFICIT' : m < 38 ? 'MODERATE_STRESS' : 'OPTIMAL');
                return (
                  <tr
                    key={f.id}
                    onClick={() => setSelectedFarmerId(Number(f.id))}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-cyan-950/40' : 'hover:bg-slate-950/60'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">
                      👨‍🌾 {f.farmer_name || f.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{f.village}</td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {f.crop_variety || f.crop} · <span className="text-slate-400">{f.growth_stage || 'Vegetative'}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{f.area_acres} Ac</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">{m.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{sat.toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          risk.includes('CRITICAL')
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : risk.includes('MODERATE')
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {risk}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white font-bold"
                      >
                        Scope #{f.id}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Row 2: In-Situ Hardware Diagnostic + Multi-Source Sensor Fusion + Multi-Agent Mesh */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
              2. In-Situ ESP32 Hardware Diagnostic
            </h3>
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              ESP32 SENSOR · GPIO34
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">Raw 12-Bit ADC</div>
              <div className="text-lg font-mono font-black text-white mt-1">{adcRaw}</div>
              <div className="text-[10px] text-slate-500">Range 0–4095</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">Pin Voltage</div>
              <div className="text-lg font-mono font-black text-amber-300 mt-1">{voltage}V</div>
              <div className="text-[10px] text-slate-500">3.30V Ref</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">Calibrated VWC</div>
              <div className="text-lg font-mono font-black text-emerald-400 mt-1">{espMoisture.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-500">In-Situ Probe</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
              3. Multi-Source Sensor Fusion Engine
            </h3>
            <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
              ESP32 + SATELLITE ({fusionConfidence}%)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">📍 ESP32 SENSOR</div>
              <div className="text-xl font-mono font-black text-amber-300 mt-1">{espMoisture.toFixed(1)}% VWC</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">🛰️ SATELLITE (ECMWF)</div>
              <div className="text-xl font-mono font-black text-cyan-300 mt-1">{satMoisture.toFixed(1)}% VWC</div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <span className="text-slate-400">Cross-Validation Verdict:</span>
            <span className="font-mono font-bold text-emerald-300">{fusionStatus}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-400">
              4. Scoped HITL Approval Queue (Farmer #{selectedFarmerId})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Safety Interlock</span>
          </div>
          <div className="space-y-2">
            {actions.slice(0, 2).map((act) => (
              <div
                key={act.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold text-white">
                    #{act.id} · {act.title || act.action_type}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    Status: {act.status} {act.execution_ref ? `(${act.execution_ref})` : ''}
                  </div>
                </div>
                {act.status === 'PENDING_APPROVAL' && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDecision(selectedFarmerId, act.id, 'APPROVED')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDecision(selectedFarmerId, act.id, 'REJECTED')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Fields & Crop Cycles + Simulated Robotics & Tasks + Camera Scans & Memory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
              5. Fields, Crop Cycles & Yield Forecast
            </h3>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded">
              AI ESTIMATE
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            {(dashboard?.fields || []).map((fld) => (
              <div key={fld.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between">
                <span className="font-bold text-white">{fld.name} ({fld.soil_type})</span>
                <span className="font-mono text-cyan-300">{fld.area_acres} Ac · {fld.irrigation_type}</span>
              </div>
            ))}
            {(dashboard?.crop_cycles || []).slice(0, 2).map((cc) => (
              <div key={cc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between">
                <span className="text-slate-300">{cc.crop_name} ({cc.current_stage})</span>
                <span className="font-mono text-emerald-400">
                  Est: {cc.expected_yield_tonnes || dashboard?.analytics?.yield_estimate_tonnes || 4.2} t
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
              6. Simulated Robotics & Fallback Tasks
            </h3>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
              SIMULATED DRONE / ROVER
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            {(dashboard?.robot_missions || []).slice(0, 2).map((rm) => (
              <div key={rm.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-white">{rm.mission_code}</span>
                  <span className="ml-2 text-slate-400">({rm.source_label || rm.data_source})</span>
                </div>
                <span className="font-mono text-amber-300">{rm.state} · {rm.progress_percent ?? rm.progress_pct}%</span>
              </div>
            ))}
            {(dashboard?.tasks || []).slice(0, 3).map((tsk) => (
              <div key={tsk.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between">
                <span className="text-slate-300 truncate max-w-[210px]">{tsk.title}</span>
                <span className="font-mono text-emerald-400">{tsk.assigned_tool} · {tsk.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
              7. Camera Scans & Persistent Farm Memory
            </h3>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded">
              CAMERA ANALYSIS
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            {(dashboard?.crop_scans || []).slice(0, 2).map((sc) => (
              <div key={sc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between">
                <span className="text-white font-bold">{sc.possible_issue || sc.diagnosis} ({sc.severity})</span>
                <span className="font-mono text-purple-300">{sc.data_source}</span>
              </div>
            ))}
            {(dashboard?.farm_activities || []).slice(0, 2).map((fa) => (
              <div key={fa.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between">
                <span className="text-slate-300 truncate max-w-[210px]">{fa.title}</span>
                <span className="font-mono text-cyan-300">{fa.data_source}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default App;
