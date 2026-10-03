import React, { useState, useEffect, useCallback } from 'react';
import { CropCycle } from './screens/CropCycle.jsx';
import { WeatherMonitoring } from './screens/WeatherMonitoring.jsx';
import { SoilIntelligence } from './screens/SoilIntelligence.jsx';
import { CropHealth } from './screens/CropHealth.jsx';
import { PestRisk } from './screens/PestRisk.jsx';
import { IrrigationManagement } from './screens/IrrigationManagement.jsx';
import { FertilizerManagement } from './screens/FertilizerManagement.jsx';
import { AIAssistant } from './screens/AIAssistant.jsx';
import { AIRecommendations } from './screens/AIRecommendations.jsx';
import { ActionApproval } from './screens/ActionApproval.jsx';
import { Notifications } from './screens/Notifications.jsx';
import { FarmerProfile } from './screens/FarmerProfile.jsx';
import { FarmManagement } from './screens/FarmManagement.jsx';
import { FieldManagement } from './screens/FieldManagement.jsx';
import { CropManagement } from './screens/CropManagement.jsx';
import { IoTMonitoring } from './screens/IoTMonitoring.jsx';
import { CropPlanning } from './screens/CropPlanning.jsx';
import { FarmActivities } from './screens/FarmActivities.jsx';
import YieldPrediction from './screens/YieldPrediction.jsx';
import HarvestPlanning from './screens/HarvestPlanning.jsx';
import { DroneMonitoring } from './screens/DroneMonitoring.jsx';
import { RoverMonitoring } from './screens/RoverMonitoring.jsx';
import FarmHistory from './screens/FarmHistory.jsx';
import AnalyticsSettings from './screens/AnalyticsSettings.jsx';

const API_BASE =
  typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:8000/api/v1`
    : 'http://localhost:8000/api/v1';

// Single dedicated farmer identity for the Farmer Mobile App (Section 3: ONE farmer, no farmer switcher)
const DEDICATED_FARMER = {
  id: 1,
  title_te: 'రమేష్ కుమార్ · కంకిపాడు (3.5 ఎకరాల వరి)',
  title_hi: 'रमेश कुमार · कंकीपाडु (3.5 एकड़ धान)',
  title_en: 'Ramesh Kumar · Kankipadu (3.5 Acres Rice)',
  farmer_name: 'Ramesh Kumar',
  village: 'Kankipadu',
  crop_variety: 'Rice (BPT-5204)',
  growth_stage: 'Vegetative',
  area_acres: 3.5,
};

export function App() {
  const selectedFarmerId = DEDICATED_FARMER.id;
  const [lang, setLang] = useState('te');
  const [activeTab, setActiveTab] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [irrigationStarted, setIrrigationStarted] = useState(false);
  const [farmerGoalCard, setFarmerGoalCard] = useState(null);
  const [showGoalDetails, setShowGoalDetails] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/farmers/${selectedFarmerId}/dashboard?lang=${lang}`);
      if (!res.ok) return;
      const data = await res.json();
      setDashboard(data);
    } catch (_) {
      // gracefully retain local state
    }
  }, [selectedFarmerId, lang]);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 4000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  const handleDecision = async (farmerId, proposalId, decision) => {
    setBusy(true);
    if (decision === 'APPROVED') {
      setIrrigationStarted(true);
    }
    const targetFarmerId = farmerId || selectedFarmerId;
    const actionId =
      proposalId ||
      dashboard?.pending_actions?.[0]?.id ||
      dashboard?.actions?.[0]?.id ||
      'ACT_001';
    try {
      await fetch(`${API_BASE}/farmers/${targetFarmerId}/actions/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: String(actionId),
          status: decision,
          actor: 'farmer',
        }),
      });
      await fetchDashboard();
    } catch (_) {
      // local optimistic UI already updated
    } finally {
      setBusy(false);
    }
  };

  const askFarmManagerGoal = async (goalText, scenarioCode) => {
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
          scenario: scenarioCode,
          lang,
        }),
      });
      if (res.ok) {
        const runData = await res.json();
        setFarmerGoalCard(runData);
        setShowGoalDetails(false);
      }
      await fetchDashboard();
    } catch (_) {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const headerTitle =
    lang === 'te'
      ? DEDICATED_FARMER.title_te
      : lang === 'hi'
      ? DEDICATED_FARMER.title_hi
      : DEDICATED_FARMER.title_en;

  const commonProps = {
    dashboard,
    data: dashboard,
    farmer: DEDICATED_FARMER,
    lang,
    setLang,
    onSetLang: setLang,
    onLanguageChange: setLang,
    selectedFarmerId,
    farmerId: selectedFarmerId,
    onRefresh: fetchDashboard,
    onDecision: handleDecision,
    onStartWatering: () =>
      handleDecision(
        selectedFarmerId,
        dashboard?.pending_actions?.[0]?.id || dashboard?.actions?.[0]?.id || 'ACT_001',
        'APPROVED'
      ),
    irrigationStarted,
    busy,
    apiBase: API_BASE,
  };

  const unreadCount = (dashboard?.notifications || []).filter((n) => !n.is_read).length || 3;
  const moisture = Number(dashboard?.soil_moisture ?? dashboard?.telemetry?.soil_moisture ?? 18.5);
  const rainProb = Number(dashboard?.weather?.precip_prob ?? 5);
  const tempC = Number(dashboard?.weather?.temperature ?? 31.2);
  const pendingAct = dashboard?.pending_actions?.[0] || dashboard?.actions?.[0];

  // Simplified Farmer Advisory Card (Section 3: What is happening? What should I do? Why?)
  const latestRun =
    farmerGoalCard || (dashboard?.agent_intelligence?.recent_agent_runs || [])[0] || null;
  const simpleCard = latestRun?.decision?.farmer_card || {
    what_is_happening:
      lang === 'te'
        ? `మీ వరి పొలం (Field 01) లో నేల తేమ తక్కువగా ఉంది (${moisture}%) మరియు వర్షం సూచన తక్కువగా ఉంది (${rainProb}%).`
        : lang === 'hi'
        ? `आपके धान के खेत (Field 01) में मिट्टी की नमी कम है (${moisture}%) और बारिश की संभावना कम है (${rainProb}%)।`
        : `Soil moisture in Field 01 is low (${moisture}%) and significant rainfall is not expected (${rainProb}%).`,
    why:
      dashboard?.advisory?.why ||
      'Soil moisture is below the crop threshold (30%) for Vegetative Rice and significant rainfall is not expected in the next 6 hours.',
    recommended:
      dashboard?.advisory?.title || 'Recommend irrigation for Field 01 (15mm).',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 md:py-5 md:px-4 flex justify-center items-start">
      <div className="w-full max-w-md min-h-screen md:min-h-[860px] bg-slate-950 text-slate-100 rounded-none md:rounded-[2.5rem] border-0 md:border md:border-slate-800 shadow-2xl flex flex-col pb-24 relative overflow-hidden">
        {/* Subtle Mobile Status Bar */}
        <div className="bg-slate-950/95 px-6 pt-2.5 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-300 select-none">
          <span className="tracking-tight font-extrabold text-white">09:41</span>
          <div className="hidden md:block w-20 h-3.5 rounded-full bg-slate-900 border border-slate-800" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold">
              DEMO DATA
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold">
              ESP32 + SAT
            </span>
          </div>
        </div>

        {/* Sticky Top App Header — Single Farmer Identity (No Farmer Switcher) */}
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/90 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-lg shadow-md shrink-0 border border-emerald-400/40">
                👨‍🌾
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-black text-white truncate">
                  {headerTitle}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 mt-0.5 truncate">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Field 01 · Kankipadu · {DEDICATED_FARMER.crop_variety}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                role="group"
                aria-label="Language Selector"
                className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800"
              >
                {[
                  { code: 'te', label: 'తె' },
                  { code: 'en', label: 'EN' },
                  { code: 'hi', label: 'हि' },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-black transition ${
                      lang === l.code
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Open Farm Updates Drawer"
                onClick={() => setDrawerOpen((prev) => !prev)}
                className="relative w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-base transition"
              >
                <span>🔔</span>
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border border-slate-950 shadow">
                  {unreadCount}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Slide-Over Notification Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-950 border-x border-slate-800 h-full overflow-y-auto p-4 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔔</span>
                  <h2 className="text-base font-black text-white">
                    Farm Notifications & Alerts
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200"
                >
                  ✕ {lang === 'te' ? 'మూసివేయి' : lang === 'hi' ? 'बंद करें' : 'Close'}
                </button>
              </div>

              <Notifications {...commonProps} />
            </div>
          </div>
        )}

        {/* Main Scrollable Content Area */}
        <main className="flex-1 px-4 py-3.5 space-y-3.5">
          {activeTab === 'home' && (
            <>
              {/* Quick At-a-Glance Strip: Crop, Stage, Soil Moisture, Weather */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-2.5 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Crop & Stage</div>
                  <div className="text-xs font-black text-emerald-300 mt-0.5 truncate">Rice · Vegetative</div>
                </div>
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-2.5 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Soil Moisture</div>
                  <div className={`text-sm font-black mt-0.5 ${moisture < 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {moisture.toFixed(1)}% {moisture < 30 ? '(LOW)' : '(OK)'}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-2.5 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Weather</div>
                  <div className="text-xs font-black text-cyan-300 mt-0.5">
                    {tempC}°C · Rain {rainProb}%
                  </div>
                </div>
              </div>

              {/* First Screen Hero: What is happening? What should I do? Why? */}
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/50 to-slate-900 border border-emerald-500/30 p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    🌾 AI Farm Decision Support
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">
                    {pendingAct?.status || (irrigationStarted ? 'APPROVED' : 'PENDING_APPROVAL')}
                  </span>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                    1. What is happening?
                  </div>
                  <div className="text-sm font-black text-white mt-0.5">
                    {simpleCard.what_is_happening}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                    2. What should I do? (AI Recommendation)
                  </div>
                  <div className="text-sm font-black text-white mt-0.5">
                    {simpleCard.recommended}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                    3. Why? (Recommendation Reason)
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed mt-0.5">
                    {simpleCard.why}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGoalDetails((p) => !p)}
                    className="text-[11px] font-bold text-emerald-400 underline"
                  >
                    {showGoalDetails ? 'Hide Details' : 'View Details'}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => askFarmManagerGoal('Should I irrigate Field 01 today?', 'IRRIGATION')}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-emerald-300"
                    >
                      💧 Check Irrigation
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => askFarmManagerGoal('Check why my crop is unhealthy', 'CROP_STRESS')}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-300"
                    >
                      🌿 Check Health
                    </button>
                  </div>
                </div>

                {showGoalDetails && (
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div>
                      <span className="font-bold text-slate-400">Field: </span>
                      Field 01 — Kankipadu Main Plot (3.5 Acres)
                    </div>
                    <div>
                      <span className="font-bold text-slate-400">Crop Stage: </span>
                      {DEDICATED_FARMER.crop_variety} · {DEDICATED_FARMER.growth_stage}
                    </div>
                    <div>
                      <span className="font-bold text-slate-400">Data Source: </span>
                      {latestRun?.decision?.primary_data_source || 'ESP32 SENSOR + WEATHER API'}
                    </div>
                  </div>
                )}
              </div>

              {/* Human-in-the-Loop Action Approval Card */}
              <ActionApproval {...commonProps} />

              {/* Crop Stage Stepper */}
              <CropCycle {...commonProps} />

              {/* Weather & Soil Summary */}
              <WeatherMonitoring {...commonProps} />

              {/* Today's Tasks Summary */}
              <FarmActivities {...commonProps} />

              {/* Important Alerts */}
              <Notifications {...commonProps} />
            </>
          )}

          {activeTab === 'farm' && (
            <>
              <FarmerProfile {...commonProps} />
              <FarmManagement {...commonProps} />
              <FieldManagement {...commonProps} />
              <CropManagement {...commonProps} />
              <SoilIntelligence {...commonProps} />
              <IrrigationManagement {...commonProps} />
              <FertilizerManagement {...commonProps} />
              <IoTMonitoring {...commonProps} />
              <YieldPrediction {...commonProps} />
              <HarvestPlanning {...commonProps} />
              <FarmHistory {...commonProps} />
              <AnalyticsSettings {...commonProps} />
            </>
          )}

          {activeTab === 'scan' && (
            <>
              <CropHealth {...commonProps} showScannerExpanded={true} />
              <PestRisk {...commonProps} />
              <DroneMonitoring {...commonProps} />
              <RoverMonitoring {...commonProps} />
            </>
          )}

          {activeTab === 'tasks' && (
            <>
              <ActionApproval {...commonProps} />
              <FarmActivities {...commonProps} />
              <Notifications {...commonProps} />
              <HarvestPlanning {...commonProps} />
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <AIAssistant {...commonProps} />
              <AIRecommendations {...commonProps} />
              <CropPlanning {...commonProps} />
              <YieldPrediction {...commonProps} />
            </>
          )}
        </main>

        {/* Professional 5-Tab Bottom Navigation: Home | Farm | Scan | Tasks | AI */}
        <nav
          aria-label="Primary Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
        >
          <div className="w-full max-w-md bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-2 grid grid-cols-5 gap-1 pointer-events-auto md:rounded-b-[2.5rem] shadow-2xl">
            {[
              { id: 'home', icon: '🏠', label: 'Home' },
              { id: 'farm', icon: '🌾', label: 'Farm' },
              { id: 'scan', icon: '📷', label: 'Scan' },
              { id: 'tasks', icon: '✅', label: 'Tasks' },
              { id: 'ai', icon: '🤖', label: 'AI' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl text-[11px] font-extrabold transition-all ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span className="mt-1 text-center leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default App;
