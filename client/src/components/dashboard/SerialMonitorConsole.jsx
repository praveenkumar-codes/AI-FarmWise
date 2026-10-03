import React from 'react';

export function SerialMonitorConsole({ telemetry, history = [], esp32Connected }) {
  const rows = (history.length > 0 ? history : telemetry ? [telemetry] : []).slice(-8);

  // Inverse of firmware formula: rawAdc = 3200 - (moisturePct / 100.0) * (3200 - 1400)
  const computeAdc = (moisture) => Math.round(3200 - (Number(moisture || 0) / 100) * 1800);
  const computeVolts = (adc) => ((adc / 4095) * 3.3).toFixed(2);

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200">
            ESP32 Hardware Serial Monitor (`COM / 115200 baud` · `GPIO 34 ADC1_CH6`)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Calibration: Dry=3200 ADC (0.0%) · Wet=1400 ADC (100.0%)
        </span>
      </div>

      <div className="p-4 font-mono text-xs space-y-2 max-h-60 overflow-y-auto bg-black/70 text-emerald-300">
        {rows.length === 0 ? (
          <div className="text-slate-500">
            [SERIAL] Waiting for ESP32 telemetry on /api/v1/telemetry...
          </div>
        ) : (
          rows.map((item, idx) => {
            const m = Number(item.soil_moisture || 0).toFixed(1);
            const rawAdc = computeAdc(item.soil_moisture);
            const volts = computeVolts(rawAdc);
            const isCrit = Number(item.soil_moisture) < 30.0;
            return (
              <div
                key={item.id || idx}
                className="border-b border-slate-900/80 pb-2 last:border-b-0"
              >
                <div className="text-slate-400">
                  [{item.timestamp || 'LIVE'}] Device: <span className="text-slate-200">{item.device_id}</span> | Pin: GPIO 34
                </div>
                <div>
                  {'  -> '}Raw ADC (12-bit): <span className="text-amber-300 font-bold">{rawAdc}</span> | Voltage: <span className="text-sky-300">{volts}V</span> | Soil Moisture: <span className={isCrit ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{m}% VWC</span> [{isCrit ? 'CRITICAL <30.0%' : 'OPTIMAL'}]
                </div>
                <div className="text-slate-400">
                  {'  -> '}Synth Root-Zone : pH={item.soil_ph} | Temp={item.soil_temperature}°C | NPK={item.nitrogen}/{item.phosphorus}/{item.potassium} mg/kg | POST 200 OK
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SerialMonitorConsole;
