import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

const FARMER_COPY = {
  te: {
    appTitle: 'AI ఫార్మ్‌వైజ్ — రైతు మిత్ర',
    selectFarmerLabel: 'రైతు ప్రొఫైల్ ఎంచుకోండి (Select Farmer):',
    hardwareOnline: '● ఫీల్డ్ సెన్సార్ ఆన్‌లైన్ · డ్రోన్/రోవర్ సిద్ధంగా ఉంది',
    healthyBanner: '🟢 పంట పరిస్థితి బాగుంది (Crop Condition Healthy)',
    dryWarningBanner: '🟡 నేల తేమ తగ్గుతోంది — తేలికపాటి నీరు అవసరం (Soil Drying)',
    criticalDryBanner: '🔴 నేల బాగా పొడిగా ఉంది — తక్షణమే నీరు అవసరం (Needs Water Now)',
    rainDelayBanner: '🌧️ భారీ వర్ష సూచన (75%) — విత్తడం & నీరు వాయిదా వేయండి',
    weatherSunny: '☀️ ఎండగా ఉంది · ఈ రోజు వర్షం సూచన లేదు',
    weatherRainIncoming: '🌧️ భారీ వర్ష సూచన (75% వర్షం) · ఈ రోజు నీరు పెట్టవద్దు',
    aiHeading: '🤖 ఈ రోజు AI సలహా (AI Recommendation for Today)',
    fusionConfirmDry: '✓ గ్రౌండ్ సెన్సార్ & ఉపగ్రహ స్కాన్లు రెండూ పొడి నేలను నిర్ధారించాయి (Ground sensor & satellite scans both confirm dry soil.)',
    fusionConfirmHealthy: '✓ గ్రౌండ్ సెన్సార్ & ఉపగ్రహ స్కాన్లు రెండూ తగినంత నేల తేమను నిర్ధారించాయి.',
    startWateringBtn: '💧 ఇప్పుడే నీరు పెట్టండి (Start Watering Now)',
    acknowledgeRainBtn: '🌧️ సలహాను ఆమోదించు — విత్తడం వాయిదా (Delay Sowing Today)',
    skipTodayBtn: '❌ ఈ రోజుకి వద్దు (Skip for Today)',
    allGoodMsg: '✅ అంతా బాగుంది! ప్రస్తుతం ఎటువంటి చర్య అవసరం లేదు.',
    waterStartedBanner: '✅ ఆమోదించబడింది! మీ పొలంలో చర్య ప్రారంభించబడింది.',
    askAgronomistBtn: '💬 AI వ్యవసాయ నిపుణుడిని అడగండి',
    quickDemoLabel: 'ESP32 ప్రత్యక్ష పరీక్ష (Ramesh Plot):',
    simDry: 'పొడి నేల (18.5%)',
    simWet: 'తడి నేల (64.0%)',
  },
  en: {
    appTitle: 'AI FarmWise — Farmer Companion',
    selectFarmerLabel: 'Select Farmer Profile (Scoped View):',
    hardwareOnline: '● Field Sensor Online · Drone/Rover Standby',
    healthyBanner: '🟢 Crop Condition Healthy',
    dryWarningBanner: '🟡 Soil is Getting Dry — Light Watering Needed',
    criticalDryBanner: '🔴 Soil is Very Dry — Needs Water Immediately',
    rainDelayBanner: '🌧️ Heavy Rain Incoming (75%) — Delay Sowing Today',
    weatherSunny: '☀️ Sunny · No rain expected today',
    weatherRainIncoming: '🌧️ Heavy Rain Incoming (75% chance) · Hold Watering',
    aiHeading: '🤖 AI Recommendation for Today',
    fusionConfirmDry: '✓ Ground sensor & satellite scans both confirm dry soil.',
    fusionConfirmHealthy: '✓ Ground sensor & satellite scans both confirm healthy soil moisture.',
    startWateringBtn: '💧 Start Watering Now',
    acknowledgeRainBtn: '🌧️ Confirm Rain Hold (Delay Sowing)',
    skipTodayBtn: '❌ Skip for Today',
    allGoodMsg: '✅ Everything looks great! No actions needed right now.',
    waterStartedBanner: '✅ Approved! Your field action has been dispatched.',
    askAgronomistBtn: '💬 Ask AI Agronomist a Question',
    quickDemoLabel: 'ESP32 Live Sensor Test (Ramesh Plot):',
    simDry: 'Test Dry Soil',
    simWet: 'Test Healthy Soil',
  },
  hi: {
    appTitle: 'AI फ़ार्मवाइज़ — किसान साथी',
    selectFarmerLabel: 'किसान प्रोफ़ाइल चुनें (Select Farmer):',
    hardwareOnline: '● फ़ील्ड सेंसर ऑनलाइन · ड्रोन/रोवर स्टैंडबाय',
    healthyBanner: '🟢 फसल की स्थिति स्वस्थ है (Crop Condition Healthy)',
    dryWarningBanner: '🟡 मिट्टी सूख रही है — हल्की सिंचाई आवश्यक है',
    criticalDryBanner: '🔴 मिट्टी बहुत सूखी है — तुरंत पानी की आवश्यकता है',
    rainDelayBanner: '🌧️ भारी बारिश की संभावना (75%) — आज बुवाई और सिंचाई रोकें',
    weatherSunny: '☀️ धूप खिली है · आज बारिश की संभावना नहीं है',
    weatherRainIncoming: '🌧️ भारी बारिश की संभावना (75%) · सिंचाई रोकें',
    aiHeading: '🤖 आज के लिए AI सलाह (AI Recommendation for Today)',
    fusionConfirmDry: '✓ ग्राउंड सेंसर और सैटेलाइट स्कैन दोनों सूखी मिट्टी की पुष्टि करते हैं (Ground sensor & satellite scans both confirm dry soil.)',
    fusionConfirmHealthy: '✓ ग्राउंड सेंसर और सैटेलाइट स्कैन दोनों पर्याप्त नमी की पुष्टि करते हैं।',
    startWateringBtn: '💧 अभी पानी देना शुरू करें (Start Watering Now)',
    acknowledgeRainBtn: '🌧️ बारिश अलर्ट स्वीकार करें — बुवाई रोकें',
    skipTodayBtn: '❌ आज के लिए छोड़ें (Skip for Today)',
    allGoodMsg: '✅ सब कुछ बढ़िया है! अभी किसी कार्यवाही की आवश्यकता नहीं है।',
    waterStartedBanner: '✅ स्वीकृत! आपके खेत के लिए निर्देश भेज दिया गया है।',
    askAgronomistBtn: '💬 AI कृषि विशेषज्ञ से पूछें',
    quickDemoLabel: 'ESP32 लाइव सेंसर परीक्षण (Ramesh Plot):',
    simDry: 'सूखी मिट्टी',
    simWet: 'स्वस्थ मिट्टी',
  },
};

export function FarmerMobileApp({
  farmers = [],
  selectedFarmerId = 1,
  onSelectFarmer,
  farmerDashboard,
  onDecision,
  onSimulateTelemetry,
  onOpenAssistant,
  busy = false,
}) {
  const { lang, setLang } = useLanguage();
  const copy = FARMER_COPY[lang] || FARMER_COPY.te;

  const profile = farmerDashboard?.farmer_profile || {};
  const moisture = Number(farmerDashboard?.telemetry?.soil_moisture ?? 18.5);
  const criticalThreshold = Number(farmerDashboard?.crop_bounds?.critical_moisture ?? 30.0);
  const statusCode = profile.status_code || (moisture < criticalThreshold ? 'CRITICAL_DEFICIT' : 'OPTIMAL');
  const isRainDelay = statusCode === 'RAIN_DELAY' || Number(farmerDashboard?.weather?.precip_prob ?? 0) >= 60;
  const isDry = !isRainDelay && moisture < criticalThreshold;
  const isDryWarning = statusCode === 'DRY_WARNING';

  const actions = farmerDashboard?.actions || [];
  const pendingAction = actions.find((a) => a.status === 'PENDING_APPROVAL');
  const recentlyApproved = actions.find((a) => a.status === 'APPROVED');

  const advisoryText =
    (pendingAction && pendingAction.why) ||
    farmerDashboard?.advisory?.why ||
    (actions[0] && actions[0].why) ||
    '';

  const getPlotHeading = () => {
    if (!profile.farmer_name) {
      return 'Field 1 · Rice Crop (35 Days Old)';
    }
    if (lang === 'te') {
      return `${profile.village_te || profile.village} పొలం · ${profile.crop_te || profile.crop_variety} (${profile.area_acres} ఎకరాలు)`;
    }
    if (lang === 'hi') {
      return `${profile.village_hi || profile.village} खेत · ${profile.crop_hi || profile.crop_variety} (${profile.area_acres} एकड़)`;
    }
    return `${profile.village} Plot · ${profile.crop_variety} · ${profile.growth_stage} (${profile.crop_age_days} Days Old · ${profile.area_acres} Acres)`;
  };

  const langPills = [
    { code: 'te', label: 'తెలుగు' },
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-amber-50 via-emerald-50/60 to-slate-100 text-slate-900 py-5 px-3 sm:px-6 flex justify-center">
      <div className="w-full max-w-md space-y-4">
        {/* Top Header + Farmer Profile Switcher + Language Pills */}
        <div className="rounded-3xl bg-white border-2 border-emerald-200 shadow-md p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-extrabold text-emerald-950 tracking-tight">
              🌾 {copy.appTitle}
            </h1>
          </div>

          {/* Scoped Farmer Profile Switcher */}
          <div className="space-y-1">
            <label
              htmlFor="farmer-profile-select"
              className="block text-xs font-extrabold uppercase tracking-wider text-emerald-800"
            >
              {copy.selectFarmerLabel}
            </label>
            <select
              id="farmer-profile-select"
              value={selectedFarmerId}
              onChange={(e) => onSelectFarmer && onSelectFarmer(Number(e.target.value))}
              className="w-full rounded-2xl bg-emerald-50 border-2 border-emerald-400 px-3.5 py-2.5 text-sm font-extrabold text-emerald-950 shadow-sm focus:outline-none focus:border-emerald-700"
            >
              {(farmers.length > 0
                ? farmers
                : [
                    { id: 1, farmer_name: 'Ramesh Kumar', crop: 'Rice', village: 'Kankipadu' },
                    { id: 2, farmer_name: 'Suresh Reddy', crop: 'Cotton (Bt-II)', village: 'Guntur' },
                    { id: 3, farmer_name: 'Venkat Rao', crop: 'Chilli (Teja)', village: 'Tenali' },
                    { id: 4, farmer_name: 'Priya Sharma', crop: 'Maize', village: 'Vijayawada' },
                    { id: 5, farmer_name: 'Lakshmi Bai', crop: 'Groundnut', village: 'Nandigama' },
                  ]
              ).map((f) => (
                <option key={f.id} value={f.id}>
                  👨‍🌾 {f.farmer_name} ({f.crop} · {f.village})
                </option>
              ))}
            </select>
          </div>

          {/* Minimalist Hardware Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
            <span>{copy.hardwareOnline}</span>
          </div>

          {/* Language Pills: [ తెలుగు | English | हिंदी ] */}
          <div className="grid grid-cols-3 gap-2 pt-1" role="group" aria-label="Language Switcher">
            {langPills.map((pill) => {
              const active = lang === pill.code;
              return (
                <button
                  key={pill.code}
                  type="button"
                  onClick={() => setLang(pill.code)}
                  className={`py-2.5 px-3 rounded-2xl text-sm font-extrabold border-2 transition-all ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-md scale-[1.02]'
                      : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CARD 1: Scoped Field Health Indicator */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-md p-5 space-y-4">
          <div className="text-lg font-extrabold text-slate-900 leading-snug">
            🌱 {getPlotHeading()}
          </div>

          {isRainDelay ? (
            <div className="rounded-2xl bg-amber-100 border-2 border-amber-400 p-4 flex items-center gap-3 text-amber-950">
              <span className="text-2xl shrink-0">🌧️</span>
              <span className="text-base font-extrabold leading-snug">
                {copy.rainDelayBanner}
              </span>
            </div>
          ) : isDryWarning ? (
            <div className="rounded-2xl bg-amber-100 border-2 border-amber-400 p-4 flex items-center gap-3 text-amber-950">
              <span className="text-2xl shrink-0">💧</span>
              <span className="text-base font-extrabold leading-snug">
                {copy.dryWarningBanner}
              </span>
            </div>
          ) : isDry ? (
            <div className="rounded-2xl bg-rose-100 border-2 border-rose-400 p-4 flex items-center gap-3 text-rose-950">
              <span className="text-2xl shrink-0">💧</span>
              <span className="text-base font-extrabold leading-snug">
                {copy.criticalDryBanner}
              </span>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-100 border-2 border-emerald-400 p-4 flex items-center gap-3 text-emerald-950">
              <span className="text-2xl shrink-0">✅</span>
              <span className="text-base font-extrabold leading-snug">
                {copy.healthyBanner}
              </span>
            </div>
          )}

          <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm font-bold text-sky-950 flex items-center justify-between">
            <span>{isRainDelay ? copy.weatherRainIncoming : copy.weatherSunny}</span>
          </div>
        </div>

        {/* CARD 2: AI Advisory Box + Simplified Ground & Satellite Evidence Confirmation */}
        <div className="rounded-3xl bg-white border-2 border-emerald-300 shadow-md p-5 space-y-3">
          <h2 className="text-base font-extrabold text-emerald-900">
            {copy.aiHeading}
          </h2>
          <p className="text-base font-semibold text-slate-800 leading-relaxed bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200">
            {advisoryText}
          </p>

          {/* Zero-Jargon Multi-Source Fusion Evidence Line */}
          <div className="rounded-2xl bg-emerald-100/80 border border-emerald-300 px-4 py-2.5 text-sm font-extrabold text-emerald-950">
            {isDry || isDryWarning ? copy.fusionConfirmDry : copy.fusionConfirmHealthy}
          </div>
        </div>

        {/* CARD 3: One-Tap Human Approval Scoped to Selected Farmer */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-md p-5 space-y-3">
          {pendingAction ? (
            <div className="space-y-3">
              <button
                type="button"
                disabled={busy || Boolean(farmerDashboard?.emergency_stop)}
                onClick={() => onDecision(selectedFarmerId, pendingAction.id, 'APPROVED')}
                className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-lg font-extrabold shadow-lg shadow-emerald-600/30 border-2 border-emerald-700 transition flex items-center justify-center gap-2"
              >
                <span>
                  {isRainDelay ? copy.acknowledgeRainBtn : copy.startWateringBtn}
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => onDecision(selectedFarmerId, pendingAction.id, 'REJECTED')}
                className="w-full py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-800 text-base font-bold border-2 border-slate-300 transition flex items-center justify-center gap-2"
              >
                <span>{copy.skipTodayBtn}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 text-center text-base font-extrabold text-emerald-950">
                {copy.allGoodMsg}
              </div>
              {recentlyApproved && (
                <div className="rounded-xl bg-sky-50 border border-sky-300 px-3.5 py-2.5 text-center text-xs font-bold text-sky-900">
                  {copy.waterStartedBanner}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversational Agronomist Helper + Subtle Field Demo Triggers */}
        <div className="rounded-3xl bg-white/90 border border-slate-200 p-4 space-y-3">
          {onOpenAssistant && (
            <button
              type="button"
              onClick={onOpenAssistant}
              className="w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-extrabold shadow transition"
            >
              {copy.askAgronomistBtn}
            </button>
          )}

          {onSimulateTelemetry && Number(selectedFarmerId) === 1 && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
              <span className="font-bold text-slate-500">{copy.quickDemoLabel}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSimulateTelemetry(18.5)}
                  className="px-2.5 py-1 rounded-lg font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                >
                  {copy.simDry}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSimulateTelemetry(64.0)}
                  className="px-2.5 py-1 rounded-lg font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300"
                >
                  {copy.simWet}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FarmerMobileApp;

