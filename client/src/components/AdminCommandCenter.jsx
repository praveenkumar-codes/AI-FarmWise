import React, { useState } from 'react';
import { Navbar } from './layout/Navbar.jsx';
import { Sidebar } from './layout/Sidebar.jsx';
import { SoilGauge } from './dashboard/SoilGauge.jsx';
import { MicroclimateWidget } from './dashboard/MicroclimateWidget.jsx';
import { SerialMonitorConsole } from './dashboard/SerialMonitorConsole.jsx';
import { ApprovalCenter } from './approvals/ApprovalCenter.jsx';
import { ApprovalCenterPage } from '../pages/ApprovalCenter.jsx';
import { MultiAgentMesh } from '../pages/MultiAgentMesh.jsx';
import { AdminPage } from '../pages/Admin.jsx';
import { StatusBadge } from './common/StatusBadge.jsx';

export function AdminCommandCenter({
  farmers = [],
  roboticsFleet = [],
  selectedFarmerId = 1,
  onSelectFarmer,
  dashboard,
  onDecision,
  onSimulateTelemetry,
  onToggleEmergencyStop,
  onOpenAssistant,
  busy = false,
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const telemetry = dashboard?.telemetry;
  const moisture = Number(telemetry?.soil_moisture ?? 18.5);
  const rawAdc = Math.round(3200 - (moisture / 100) * 1800);
  const voltage = ((rawAdc / 4095) * 3.3).toFixed(2);
  const criticalThreshold = dashboard?.crop_bounds?.critical_moisture ?? 30.0;

  const actions = dashboard?.actions || [];
  const pendingCount = actions.filter((a) => a.status === 'PENDING_APPROVAL').length;
  const lastDispatched = actions.find((a) => a.execution_ref);

  const filteredFarmers = (farmers || []).filter((f) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      f.farmer_name.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.crop_variety.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'CRITICAL') {
      return f.status_code === 'CRITICAL_DEFICIT' || f.status_code === 'DRY_WARNING';
    }
    if (statusFilter === 'OPTIMAL') {
      return f.status_code === 'OPTIMAL';
    }
    if (statusFilter === 'PENDING_APPROVAL') {
      return f.action_status === 'PENDING_APPROVAL';
    }
    return true;
  });

  const getStatusBadgeTone = (code) => {
    if (code === 'CRITICAL_DEFICIT') {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    }
    if (code === 'DRY_WARNING' || code === 'RAIN_DELAY') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
    }
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        esp32Connected={Boolean(dashboard?.esp32_connected)}
        emergencyStop={Boolean(dashboard?.emergency_stop)}
        onToggleEmergencyStop={onToggleEmergencyStop}
        onSimulateTelemetry={onSimulateTelemetry}
        onOpenAssistant={onOpenAssistant}
        busy={busy}
      />

      {dashboard?.emergency_stop && (
        <div className="bg-amber-500 text-slate-950 font-bold text-xs px-6 py-2 text-center uppercase tracking-wider">
          ⚠ SAFETY INTERLOCK ENGAGED — All MAVLink & Irrigation Valve Dispatches Locked Out
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAssistant={onOpenAssistant}
          pendingCount={pendingCount}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <>
              {/* REGIONAL FLEET COMMAND TABLE (All 5 Farmers) */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-100">
                      Regional Fleet Command — 5 Registered Farmers (Multi-Tenant Priority Matrix)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Click any farmer row to inspect their scoped plot telemetry, LLM tool trace, and MAVLink dispatch queue. Farmer #1 (Ramesh Kumar) streams live ESP32 GPIO 34 hardware data.
                    </p>
                  </div>

                  {/* Search & Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search farmer, village, crop..."
                      className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    {['ALL', 'CRITICAL', 'OPTIMAL', 'PENDING_APPROVAL'].map((flt) => (
                      <button
                        key={flt}
                        type="button"
                        onClick={() => setStatusFilter(flt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          statusFilter === flt
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {flt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3">Farmer Name</th>
                        <th className="py-2.5 px-3">Village</th>
                        <th className="py-2.5 px-3">Crop & Stage</th>
                        <th className="py-2.5 px-3">Soil Moisture</th>
                        <th className="py-2.5 px-3">Weather / Pest Risk</th>
                        <th className="py-2.5 px-3">Agent Action</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredFarmers.map((f) => {
                        const isSelected = Number(selectedFarmerId) === Number(f.id);
                        return (
                          <tr
                            key={f.id}
                            onClick={() => onSelectFarmer && onSelectFarmer(Number(f.id))}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400'
                                : 'hover:bg-slate-950/60'
                            }`}
                          >
                            <td className="py-3 px-3 font-bold text-slate-100">
                              <div className="flex items-center gap-2">
                                <span>#{f.id} {f.farmer_name}</span>
                                {f.id === 1 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px]">
                                    ESP32 GPIO34
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              {f.village} ({f.area_acres} ac)
                            </td>
                            <td className="py-3 px-3 text-slate-200">
                              <div className="font-semibold">{f.crop_variety}</div>
                              <div className="text-[11px] text-slate-400">{f.growth_stage}</div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold">
                              <span
                                className={
                                  f.soil_moisture < f.critical_threshold
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {Number(f.soil_moisture).toFixed(1)}%
                              </span>
                              <span className="text-slate-500 text-[10px] ml-1">
                                (min {f.critical_threshold}%)
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div>Rain Prob: {f.precip_prob}%</div>
                              <div className="text-[11px] text-amber-300">{f.pest_or_disease_risk}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-200 max-w-xs">
                              <div className="font-semibold truncate">{f.advisory_title}</div>
                              {f.execution_ref && (
                                <span className="inline-block mt-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                  {f.execution_ref}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeTone(
                                    f.status_code
                                  )}`}
                                >
                                  {f.status_code}
                                </span>
                                <StatusBadge status={f.action_status} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* GLOBAL FLEET ROBOTICS STATUS (Shared Drones, Rovers & Valves) */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                    Global Shared Robotics & Actuator Fleet Status (Servicing 5 Farms)
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Tool: check_fleet_availability()
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {(roboticsFleet || []).map((unit) => (
                    <div
                      key={unit.unit_id}
                      className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-300">
                          {unit.unit_id}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                          {unit.status} · {unit.battery_pct}%
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-100">{unit.name}</div>
                      <div className="text-[11px] text-slate-400">{unit.assigned_zone}</div>
                      <div className="text-[10px] font-mono text-slate-500">{unit.protocol}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Farmer Engineering Diagnostic Strip: In-Situ Soil ADC + Fleet Dispatch Protocol */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Selected Plot Diagnostics — Farmer #{selectedFarmerId} ({dashboard?.farmer_profile?.farmer_name || 'Ramesh Kumar'})
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Sensor Mode:{' '}
                      <span className="font-mono text-slate-200">
                        {dashboard?.farmer_profile?.sensor_mode || 'LIVE_ESP32_GPIO34'}
                      </span>{' '}
                      · Pinout: <span className="font-mono text-slate-200">ADC1_CH6 (GPIO 34)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-xs">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400">Raw ADC: </span>
                      <span className="text-amber-300 font-bold">{rawAdc}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400">Voltage: </span>
                      <span className="text-sky-300 font-bold">{voltage}V</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900/90 border border-sky-500/30 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                      Fleet Dispatch Protocol & Telemetry Link
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      MAVLink 2.0 <span className="font-mono text-slate-200">UDP:14550</span> · Assigned:{' '}
                      <span className="font-mono text-slate-200">
                        {dashboard?.farmer_profile?.fleet_unit || 'MAVLink Valve V1'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-bold">
                      {lastDispatched
                        ? `LAST PKT: ${lastDispatched.execution_ref}`
                        : 'LINK READY (STANDBY)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Gauge + Synthesized Root-Zone Chemistry Matrix */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-5">
                  <SoilGauge
                    moisture={moisture}
                    satelliteMoisture={
                      dashboard?.weather?.satellite_soil_moisture ??
                      dashboard?.sensor_fusion?.satellite_moisture ??
                      21.0
                    }
                    sensorFusion={dashboard?.sensor_fusion || {}}
                    criticalThreshold={criticalThreshold}
                    deviceId={telemetry?.device_id || 'esp32_zone_01'}
                  />
                </div>
                <div className="xl:col-span-7">
                  <MicroclimateWidget telemetry={telemetry} />
                </div>
              </div>

              {/* Embedded Hardware UART Serial Monitor Console Stream (COM / 115200 baud) */}
              <SerialMonitorConsole
                telemetry={telemetry}
                history={dashboard?.telemetry_history || []}
                esp32Connected={Boolean(dashboard?.esp32_connected)}
              />

              {/* Approval Center with MAVLink Packet IDs & History */}
              <ApprovalCenter
                actions={actions}
                onDecision={(actionId, status) =>
                  onDecision(selectedFarmerId, actionId, status)
                }
                busy={busy}
                emergencyStop={Boolean(dashboard?.emergency_stop)}
              />
            </>
          )}

          {activeTab === 'approvals' && (
            <ApprovalCenterPage
              dashboard={dashboard}
              onDecision={(actionId, status) =>
                onDecision(selectedFarmerId, actionId, status)
              }
              busy={busy}
            />
          )}

          {activeTab === 'monitoring' && <MultiAgentMesh dashboard={dashboard} />}

          {activeTab === 'admin' && <AdminPage dashboard={dashboard} />}
        </main>
      </div>
    </div>
  );
}

export default AdminCommandCenter;
