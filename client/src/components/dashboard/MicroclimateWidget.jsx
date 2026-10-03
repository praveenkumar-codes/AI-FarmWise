import React from 'react';
import { MetricCard } from '../common/MetricCard.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export function MicroclimateWidget({ telemetry }) {
  const { t } = useLanguage();
  const synthBadge = t.telemetry.synthesizedBadge;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          {t.telemetry.chemistryTitle}
        </h3>
        <span className="text-xs text-slate-400">Rice · Vegetative Profile</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title={t.telemetry.soilPh}
          value={telemetry?.soil_ph?.toFixed(2)}
          unit="pH"
          rangeText="Synth range: 6.4 – 7.1"
          badge={synthBadge}
          accent="sky"
        />
        <MetricCard
          title={t.telemetry.soilTemp}
          value={telemetry?.soil_temperature?.toFixed(1)}
          unit="°C"
          rangeText="Synth range: 25.5 – 29.5°C"
          badge={synthBadge}
          accent="amber"
        />
        <MetricCard
          title={t.telemetry.nitrogen}
          value={telemetry?.nitrogen?.toFixed(1)}
          unit="mg/kg"
          rangeText="Synth range: 28.0 – 36.0"
          badge={synthBadge}
          accent="emerald"
        />
        <MetricCard
          title={t.telemetry.phosphorus}
          value={telemetry?.phosphorus?.toFixed(1)}
          unit="mg/kg"
          rangeText="Synth range: 16.0 – 24.0"
          badge={synthBadge}
          accent="violet"
        />
        <MetricCard
          title={t.telemetry.potassium}
          value={telemetry?.potassium?.toFixed(1)}
          unit="mg/kg"
          rangeText="Synth range: 170.0 – 205.0"
          badge={synthBadge}
          accent="emerald"
        />
      </div>
    </div>
  );
}

export default MicroclimateWidget;
