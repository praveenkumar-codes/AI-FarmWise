import React from 'react';

export function Notifications({
  dashboard,
  farmer,
  lang = 'te',
  busy = false,
  onStartWatering,
  irrigationStarted = false,
}) {
  const dbNotifs = dashboard?.notifications || [];

  const getIcon = (cat = '') => {
    const c = cat.toUpperCase();
    if (c.includes('IRRIGATION') || c.includes('WATER'))
      return { icon: '💧', bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' };
    if (c.includes('WEATHER'))
      return { icon: '☀️', bg: 'bg-sky-500/20 border-sky-500/40 text-sky-300' };
    if (c.includes('SCAN') || c.includes('PEST'))
      return { icon: '📷', bg: 'bg-violet-500/20 border-violet-500/40 text-violet-300' };
    if (c.includes('DRONE') || c.includes('ROVER'))
      return { icon: '🛸', bg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' };
    return { icon: '🛰️', bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' };
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🔔</span>
          <h3 className="text-sm font-extrabold text-white">
            Farm Updates (తోట సమాచారం)
          </h3>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
          {dbNotifs.length} {lang === 'te' ? 'అప్‌డేట్‌లు' : lang === 'hi' ? 'अपडेट' : 'Updates'}
        </span>
      </div>

      <div className="space-y-2.5">
        {dbNotifs.map((n, idx) => {
          const style = getIcon(n.category);
          const isWaterAlert =
            idx === 0 &&
            (n.category === 'IRRIGATION_ALERT' || (n.severity === 'CRITICAL' && n.category !== 'WEATHER_ALERT'));
          return (
            <div
              key={n.id || idx}
              className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center text-base shrink-0 ${style.bg}`}
                  >
                    {style.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {n.category}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700">
                        {n.data_source || 'ESP32 SENSOR'}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-white mt-0.5">
                      {n.title}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {(n.created_at || '').slice(11, 16) || 'Live'}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed pl-1">{n.message}</p>

              {isWaterAlert && (
                <div className="pt-1">
                  {irrigationStarted ? (
                    <div className="rounded-xl bg-emerald-600/20 border border-emerald-500/40 px-3 py-2 text-xs font-extrabold text-emerald-300">
                      ✅ నీరు పెట్టే పని ప్రారంభించబడింది (Irrigation Started)
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onStartWatering && onStartWatering()}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow transition"
                    >
                      💧 ఇప్పుడే నీరు పెట్టండి (Start Watering Now)
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Notifications;

