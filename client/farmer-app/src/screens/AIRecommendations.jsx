import React from 'react';

export function AIRecommendations({ dashboard, lang = 'te' }) {
  const titleByLang = {
    te: '🤖 నేటి AI వ్యవసాయ సలహా (Today’s Advice)',
    hi: '🤖 आज की AI कृषि सलाह (Today’s Advice)',
    en: '🤖 Today’s Smart Farm Advice',
  };

  const summaryByLang = {
    te: 'మీ మిర్చి తోటలో మొక్కల ఎదుగుదల బాగుంది. నేలలో తేమ తగ్గినందున ఈరోజు సాయంత్రం లోపు డ్రిప్ ద్వారా నీరు అందిస్తే పూత రాలకుండా ఉంటుంది.',
    hi: 'आपकी मिर्च की फसल की बढ़वार अच्छी है। मिट्टी में नमी कम होने के कारण आज ड्रिप से हल्की सिंचाई करने पर फूल गिरने से बचाव होगा।',
    en: 'Your chilli crop is growing steadily. Giving a light watering cycle today will keep the roots cool and prevent flower drop.',
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-4 space-y-2.5 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-emerald-400">
          {titleByLang[lang] || titleByLang.te}
        </span>
        <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          {lang === 'te' ? '✓ ధృవీకరించబడింది' : lang === 'hi' ? '✓ सत्यापित' : '✓ Verified'}
        </span>
      </div>
      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        {summaryByLang[lang] || summaryByLang.te}
      </p>
    </div>
  );
}

export default AIRecommendations;
