import React from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export function Navbar({
  esp32Connected,
  emergencyStop,
  onToggleEmergencyStop,
  onSimulateTelemetry,
  onOpenAssistant,
  busy,
}) {
  const { lang, setLang, t, languages } = useLanguage();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
          FW
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 leading-tight">{t.appName}</h1>
          <p className="text-xs text-slate-400">{t.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Hardware Online Indicator */}
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 ${
            esp32Connected
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
          }`}
        >
          <span>{esp32Connected ? t.hardware.connected : t.hardware.disconnected}</span>
        </div>

        {/* Quick Hardware Telemetry Simulators for Testing */}
        <button
          type="button"
          disabled={busy}
          onClick={() => onSimulateTelemetry(18.5)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition"
        >
          {t.hardware.simulateCritical}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSimulateTelemetry(64.0)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
        >
          {t.hardware.simulateOptimal}
        </button>

        {/* AI Assistant Drawer Button */}
        {onOpenAssistant && (
          <button
            type="button"
            onClick={onOpenAssistant}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600/25 hover:bg-violet-600/40 text-violet-200 border border-violet-500/40 transition"
          >
            ✦ {t.assistant?.buttonLabel || 'AI Assistant'}
          </button>
        )}

        {/* Multilingual Switcher (English, Telugu, Hindi) */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                lang === item.code
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.native}
            </button>
          ))}
        </div>

        {/* Emergency Stop Interlock Button */}
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleEmergencyStop(!emergencyStop)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${
            emergencyStop
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
              : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400/50'
          }`}
        >
          {emergencyStop ? t.hardware.releaseStop : t.hardware.emergencyStop}
        </button>
      </div>
    </header>
  );
}

export default Navbar;
