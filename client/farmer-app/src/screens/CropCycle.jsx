import React from 'react';

const STAGES = [
  { key: 'Sowing', te: 'విత్తడం', hi: 'बुवाई', en: 'Sowing', icon: '🌱' },
  { key: 'Vegetative', te: 'శాఖా దశ', hi: 'वानस्पतिक', en: 'Vegetative', icon: '🌿' },
  { key: 'Flowering', te: 'పూత దశ', hi: 'फूल आना', en: 'Flowering', icon: '🌼' },
  { key: 'Pod Development', te: 'కాయ దశ', hi: 'फल बनना', en: 'Fruiting', icon: '🌶️' },
  { key: 'Harvest', te: 'కోత దశ', hi: 'कटाई', en: 'Harvest', icon: '🚜' },
];

export function CropCycle({ dashboard, lang = 'te' }) {
  const currentStage = dashboard?.farmer_profile?.growth_stage || 'Vegetative';
  const activeIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.key.toLowerCase() === currentStage.toLowerCase())
  );

  const stageTitle =
    lang === 'te'
      ? 'Crop Stage · Vegetative (మిర్చి శాఖా దశ)'
      : lang === 'hi'
      ? 'फसल अवस्था · वानस्पतिक (Crop Stage · Vegetative)'
      : 'Crop Stage · Vegetative (మిర్చి శాఖా దశ)';

  const dayBadge =
    lang === 'te' ? 'రోజు 35 / 120' : lang === 'hi' ? 'दिन 35 / 120' : 'Day 35 of 120';

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-4 space-y-3.5 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <h3 className="text-xs font-extrabold tracking-wide text-emerald-300">
            {stageTitle}
          </h3>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {dayBadge}
        </span>
      </div>

      <div className="relative flex items-center justify-between pt-1">
        {STAGES.map((stage, idx) => {
          const done = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const label = lang === 'te' ? stage.te : lang === 'hi' ? stage.hi : stage.en;
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center text-center z-10 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    isCurrent
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 ring-4 ring-emerald-500/20 scale-110'
                      : done
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  {done ? '✓' : stage.icon}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-bold leading-tight ${
                    isCurrent
                      ? 'text-emerald-300'
                      : done
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 -mt-4 mx-0.5 rounded ${
                    idx < activeIdx ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default CropCycle;
