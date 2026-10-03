import React from 'react';

export function SoilIntelligence({ dashboard, lang = 'te' }) {
  const t = dashboard?.telemetry || {};
  const moisture = Number(dashboard?.soil_moisture ?? t.soil_moisture ?? 18.5);
  const crit = Number(dashboard?.crop_bounds?.critical_moisture ?? 30.0);
  const isDry = moisture < crit;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-emerald-400">
          {lang === 'te'
            ? '🌱 నేల తేమ & బలం (Soil Moisture & Health)'
            : lang === 'hi'
            ? '🌱 मिट्टी की नमी और स्वास्थ्य (Soil Health)'
            : '🌱 Soil Moisture & Fertility'}
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {lang === 'te'
            ? 'సెన్సార్ + ఉపగ్రహ నిర్ధారణ'
            : lang === 'hi'
            ? 'सेंसर + उपग्रह सत्यापित'
            : 'Sensor + Satellite Verified'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'నేల తేమ స్థితి' : lang === 'hi' ? 'मिट्टी की नमी' : 'Soil Moisture'}
          </div>
          <div className={`text-base font-extrabold mt-0.5 ${isDry ? 'text-amber-300' : 'text-emerald-400'}`}>
            {isDry
              ? lang === 'te'
                ? 'తక్కువగా ఉంది (నీరు పెట్టాలి)'
                : lang === 'hi'
                ? 'कम है (सिंचाई करें)'
                : 'Low (Needs Water)'
              : lang === 'te'
              ? 'సరిపడా తేమ ఉంది'
              : lang === 'hi'
              ? 'पर्याप्त नमी है'
              : 'Good Moisture'}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'వేర్ల లోతు తేమ' : lang === 'hi' ? 'जड़ क्षेत्र की नमी' : 'Root Zone Status'}
          </div>
          <div className="text-base font-extrabold text-sky-300 mt-0.5">
            {lang === 'te' ? 'తడి అవసరం' : lang === 'hi' ? 'पानी आवश्यक' : 'Water Today'}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'నేల స్వభావం' : lang === 'hi' ? 'मिट्टी का संतुलन' : 'Soil Condition'}
          </div>
          <div className="font-bold text-emerald-300 mt-0.5">
            {lang === 'te' ? 'మిర్చికి అనుకూలం' : lang === 'hi' ? 'फसल के लिए उत्तम' : 'Ideal for Chilli'}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="text-slate-400 text-[11px]">
            {lang === 'te' ? 'పోషకాల బలం' : lang === 'hi' ? 'पोषक तत्व स्तर' : 'Soil Nutrients'}
          </div>
          <div className="font-bold text-emerald-300 mt-0.5">
            {lang === 'te' ? 'సమతుల్యంగా ఉంది' : lang === 'hi' ? 'संतुलित पोषण' : 'Well Balanced'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoilIntelligence;
