import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import { FarmerMobileApp } from './components/FarmerMobileApp.jsx';
import { AdminCommandCenter } from './components/AdminCommandCenter.jsx';
import { AssistantDrawer } from './components/assistant/AssistantDrawer.jsx';
import { farmService } from './services/farmService.js';

const POLL_INTERVAL_MS = 2000;
const VIEW_STORAGE_KEY = 'farmwise_client_view_mode';
const FARMER_STORAGE_KEY = 'farmwise_selected_farmer_id';

function getInitialViewMode() {
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'farmer' || saved === 'admin') {
      return saved;
    }
  } catch (_) {}
  return 'farmer';
}

function getInitialFarmerId() {
  try {
    const saved = Number(window.localStorage.getItem(FARMER_STORAGE_KEY));
    if (saved >= 1 && saved <= 5) {
      return saved;
    }
  } catch (_) {}
  return 1;
}

function FarmWiseShell() {
  const { lang } = useLanguage();
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [selectedFarmerId, setSelectedFarmerId] = useState(getInitialFarmerId);
  const [farmersList, setFarmersList] = useState([]);
  const [roboticsFleet, setRoboticsFleet] = useState([]);
  const [farmerDashboard, setFarmerDashboard] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  const selectViewMode = (mode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch (_) {}
  };

  const selectFarmer = (farmerId) => {
    const idNum = Number(farmerId) || 1;
    setSelectedFarmerId(idNum);
    try {
      window.localStorage.setItem(FARMER_STORAGE_KEY, String(idNum));
    } catch (_) {}
  };

  const fetchAllState = useCallback(async () => {
    try {
      const [fleetRes, scopedDash] = await Promise.all([
        farmService.getFarmers(lang),
        farmService.getFarmerDashboard(selectedFarmerId, lang),
      ]);
      setFarmersList(fleetRes.farmers || []);
      setRoboticsFleet(fleetRes.robotics_fleet || []);
      setFarmerDashboard(scopedDash);
      setErrorBanner(null);
    } catch (err) {
      setErrorBanner(err.message || 'Unable to reach FastAPI backend on port 8000');
    }
  }, [lang, selectedFarmerId]);

  useEffect(() => {
    fetchAllState();
    const timer = setInterval(fetchAllState, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAllState]);

  const handleDecision = async (farmerIdOrActionId, maybeActionId, maybeStatus) => {
    setBusy(true);
    try {
      if (maybeStatus !== undefined) {
        await farmService.submitFarmerActionDecision(
          Number(farmerIdOrActionId),
          maybeActionId,
          maybeStatus
        );
      } else {
        await farmService.submitFarmerActionDecision(
          selectedFarmerId,
          farmerIdOrActionId,
          maybeActionId
        );
      }
      await fetchAllState();
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSimulateTelemetry = async (moisture) => {
    setBusy(true);
    try {
      await farmService.sendTelemetry('esp32_zone_01', moisture);
      await fetchAllState();
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleEmergencyStop = async (active) => {
    setBusy(true);
    try {
      await farmService.setEmergencyStop(active);
      await fetchAllState();
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Persistent Top Floating Client View Switcher: [ 👨‍🌾 Farmer App (Mobile) | ⚙️ Admin Command Center ] */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2 flex items-center justify-center">
        <div
          className="inline-flex items-center rounded-full bg-slate-950 p-1 border border-slate-700 shadow-lg"
          role="tablist"
          aria-label="Client View Switcher"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'farmer'}
            onClick={() => selectViewMode('farmer')}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold transition-all ${
              viewMode === 'farmer'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👨‍🌾 Farmer App (Mobile)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'admin'}
            onClick={() => selectViewMode('admin')}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold transition-all ${
              viewMode === 'admin'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚙️ Admin Command Center
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-6 py-2 text-xs text-rose-200 flex items-center justify-between">
          <span>⚠ {errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {viewMode === 'farmer' ? (
        <FarmerMobileApp
          farmers={farmersList}
          selectedFarmerId={selectedFarmerId}
          onSelectFarmer={selectFarmer}
          farmerDashboard={farmerDashboard}
          onDecision={handleDecision}
          onSimulateTelemetry={handleSimulateTelemetry}
          onOpenAssistant={() => setAssistantOpen(true)}
          busy={busy}
        />
      ) : (
        <AdminCommandCenter
          farmers={farmersList}
          roboticsFleet={roboticsFleet}
          selectedFarmerId={selectedFarmerId}
          onSelectFarmer={selectFarmer}
          dashboard={farmerDashboard}
          onDecision={handleDecision}
          onSimulateTelemetry={handleSimulateTelemetry}
          onToggleEmergencyStop={handleToggleEmergencyStop}
          onOpenAssistant={() => setAssistantOpen(true)}
          busy={busy}
        />
      )}

      <AssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        dashboard={farmerDashboard}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <FarmWiseShell />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
