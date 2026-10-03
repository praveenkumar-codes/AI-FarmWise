import React, { useState, useEffect } from 'react';

export function ActionApproval({
  dashboard,
  selectedFarmerId = 1,
  onDecision,
  busy = false,
  lang = 'te',
  irrigationStarted = false,
}) {
  const [localStarted, setLocalStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLocalStarted(false);
    setDismissed(false);
  }, [selectedFarmerId]);

  const actions = dashboard?.actions || dashboard?.proposals || [];
  const pending = actions.find((a) => a.status === 'PENDING_APPROVAL');
  const approvedAction = actions.find((a) => a.status === 'APPROVED');
  const isIrrigating = irrigationStarted || localStarted || Boolean(approvedAction && !pending);

  const irrIntel = dashboard?.agent_intelligence?.irrigation || {};
  const moisture = Number(dashboard?.soil_moisture ?? dashboard?.telemetry?.soil_moisture ?? 18.5);
  const crit = Number(dashboard?.crop_bounds?.critical_moisture ?? 30.0);
  const rainProb = Number(dashboard?.weather?.precip_prob ?? 5);
  const needsWater = moisture < crit && rainProb < 60;

  // Dynamic reasoning from backend IrrigationAgent / DecisionAgent with natural vernacular fallback
  const dynamicWhy =
    lang === 'te'
      ? irrIntel.reason_te ||
        dashboard?.advisory?.why ||
        'నేల ఎండిపోయింది. వర్షం లేదు. మిర్చి పంట ఆరోగ్యంగా ఉండటానికి ఇప్పుడే నీరు పెట్టాలి.'
      : lang === 'hi'
      ? irrIntel.reason_hi ||
        dashboard?.advisory?.why ||
        'मिट्टी में नमी बहुत कम है। बारिश की कोई संभावना नहीं है। फसल को सूखने से बचाने के लिए अभी सिंचाई करें।'
      : irrIntel.reason ||
        dashboard?.advisory?.why ||
        'Soil is dry and no rain is expected. Apply irrigation now to protect crop yield.';

  const badgeByLang = {
    te: needsWater
      ? 'అత్యవసర నీటి సూచన · AI నిర్ధారణ'
      : rainProb >= 60
      ? 'భారీ వర్ష సూచన · నీరు పెట్టవద్దు'
      : 'నేల తేమ బాగుంది · నీరు అవసరం లేదు',
    hi: needsWater
      ? 'तत्काल सिंचाई सलाह · AI सत्यापित'
      : rainProb >= 60
      ? 'भारी बारिश की संभावना · सिंचाई रोकें'
      : 'मिट्टी की नमी पर्याप्त है',
    en: needsWater
      ? 'Urgent Watering Advice · AI Verified'
      : rainProb >= 60
      ? 'Rain Hold · Do Not Irrigate Today'
      : 'Irrigation Not Required · Moisture Optimal',
  };

  const handleStartWatering = async () => {
    setLocalStarted(true);
    if (onDecision) {
      const targetId = pending?.id || 'ACT_DEFAULT';
      await onDecision(selectedFarmerId, targetId, 'APPROVED');
    }
  };

  const handleDismiss = async () => {
    setDismissed(true);
    if (onDecision && pending?.id) {
      await onDecision(selectedFarmerId, pending.id, 'REJECTED');
    }
  };

  if (dismissed && !isIrrigating) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between text-xs text-slate-300">
        <span>
          {lang === 'te'
            ? 'సూచన వాయిదా వేయబడింది (తర్వాత చూద్దాం)'
            : lang === 'hi'
            ? 'सिंचाई सलाह बाद के लिए टाल दी गई'
            : 'Watering reminder snoozed for later'}
        </span>
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="text-emerald-400 font-bold underline ml-2"
        >
          {lang === 'te' ? 'మళ్ళీ చూడండి' : lang === 'hi' ? 'फिर से देखें' : 'Show Again'}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-4 space-y-3.5 shadow-xl transition-all ${
        isIrrigating
          ? 'bg-emerald-950/60 border-2 border-emerald-500/60'
          : needsWater
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/50'
          : 'bg-slate-900/95 border border-emerald-500/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isIrrigating ? '✅' : needsWater ? '💧' : '🌿'}</span>
          <span
            className={`text-xs font-extrabold tracking-wide ${
              isIrrigating || !needsWater ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {badgeByLang[lang] || badgeByLang.te}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {dashboard?.farmer_profile?.id === 1 ? 'ESP32 SENSOR + SATELLITE' : 'SATELLITE + WEATHER API'}
        </span>
      </div>

      {/* WHY Explanation */}
      <div className="bg-slate-950/85 p-3.5 rounded-xl border border-slate-800/90 space-y-1.5">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
          {lang === 'te' ? 'ఎందుకు ఈ సూచన చేయబడింది (WHY):' : lang === 'hi' ? 'यह सलाह क्यों दी गई है (WHY):' : 'WHY THIS RECOMMENDATION WAS MADE:'}
        </div>
        <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
          {dynamicWhy}
        </p>
      </div>

      {isIrrigating ? (
        <div className="rounded-xl bg-emerald-600/25 border border-emerald-400/50 p-3.5 text-center space-y-1">
          <div className="text-sm sm:text-base font-black text-emerald-200">
            ✅ నీరు పెట్టే పని ప్రారంభించబడింది (Irrigation Started)
          </div>
          <div className="text-xs text-emerald-300/90">
            {approvedAction?.execution_ref
              ? `Dispatched Ref: ${approvedAction.execution_ref} · `
              : ''}
            {lang === 'te'
              ? 'మోటార్ మరియు డ్రిప్ వాల్వ్ ఆన్ చేయబడ్డాయి · 35 నిమిషాల పాటు నీరు అందుతుంది'
              : lang === 'hi'
              ? 'मोटर और ड्रिप वाल्व चालू कर दिए गए हैं · 35 मिनट तक सिंचाई चलेगी'
              : 'Smart pump & drip valves activated · Watering cycle running for 35 mins'}
          </div>
        </div>
      ) : needsWater || pending ? (
        <div className="space-y-2.5 pt-0.5">
          <button
            type="button"
            disabled={busy || Boolean(dashboard?.emergency_stop)}
            onClick={handleStartWatering}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-sm sm:text-base font-black shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-2"
          >
            <span>💧 ఇప్పుడే నీరు పెట్టండి (Start Watering Now)</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold border border-slate-700 transition flex items-center justify-center gap-1.5"
          >
            <span>✕ తర్వాత చూద్దాం (Dismiss / Later)</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/40 p-3 text-xs font-bold text-emerald-200 text-center">
          ✅ {lang === 'te' ? 'ప్రస్తుతం నీరు పెట్టవలసిన అవసరం లేదు (Irrigation Not Required Today)' : 'Irrigation Not Required Today — Soil Moisture & Forecast Optimal'}
        </div>
      )}
    </div>
  );
}

export default ActionApproval;

