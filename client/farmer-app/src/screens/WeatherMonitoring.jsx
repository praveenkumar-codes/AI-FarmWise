import React from 'react';

export function WeatherMonitoring({ dashboard, lang = 'te' }) {
  const w = dashboard?.weather || {};
  const rainProb = w.precip_prob ?? w.rain_prob_6h ?? 5;
  const temp = w.temperature ?? w.ambient_temp_c ?? 32;
  const humidity = w.relative_humidity_2m ?? 58;

  const titleByLang = {
    te: '☀️ వాతావరణ సమాచారం (Local Weather)',
    hi: '☀️ आज का मौसम (Local Weather)',
    en: '☀️ Today’s Farm Weather',
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-sky-400">
          {titleByLang[lang] || titleByLang.te}
        </span>
        <span className="text-[11px] font-bold text-amber-300">
          {lang === 'te' ? '☀️ ఎండగా ఉంది' : lang === 'hi' ? '☀️ तेज धूप' : '☀️ Clear & Sunny'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'ఉష్ణోగ్రత' : lang === 'hi' ? 'तापमान' : 'Temperature'}
          </div>
          <div className="text-base font-extrabold text-amber-300 mt-0.5">{temp}°C</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'వర్షం అవకాశం' : lang === 'hi' ? 'बारिश संभावना' : 'Rain Chance'}
          </div>
          <div className="text-base font-extrabold text-sky-300 mt-0.5">
            {rainProb}% ({lang === 'te' ? 'లేదు' : lang === 'hi' ? 'कम' : 'Low'})
          </div>
        </div>
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'గాలిలో తేమ' : lang === 'hi' ? 'हवा में नमी' : 'Air Humidity'}
          </div>
          <div className="text-base font-extrabold text-emerald-300 mt-0.5">{humidity}%</div>
        </div>
      </div>
    </div>
  );
}

export default WeatherMonitoring;
