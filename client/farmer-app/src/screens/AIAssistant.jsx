import React, { useState } from 'react';

const SAMPLE_PROMPTS = [
  { lang: 'te', text: 'ఈ రోజు మిర్చి తోటకు నీరు పెట్టాలా?' },
  { lang: 'en', text: 'Should I water my crop today?' },
  { lang: 'hi', text: 'क्या मुझे आज फसल में पानी देना चाहिए?' },
];

export function AIAssistant({ dashboard, lang = 'te', onSetLang, apiBase = 'http://localhost:8000/api/v1' }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'నమస్కారం వెంకట్రావు గారు! నేను మీ AI మిత్ర (వ్యవసాయ సహాయకుడిని). మీ మిర్చి పంట, నీటి తడి లేదా ఎరువుల గురించి అడగండి.',
    },
  ]);

  const ask = async (question, targetLang = lang) => {
    const q = (question || '').trim();
    if (!q || sending) return;
    if (onSetLang && targetLang && targetLang !== lang) {
      onSetLang(targetLang);
    }
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setSending(true);
    try {
      const r = await fetch(`${apiBase}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, language: targetLang || lang || 'te' }),
      });
      const data = await r.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply || 'No response' }]);
    } catch (_) {
      const fallback =
        targetLang === 'hi'
          ? 'मिट्टी में नमी कम है और बारिश की संभावना नहीं है। कृपया अभी सिंचाई शुरू करें।'
          : targetLang === 'en'
          ? 'Soil is dry and no rain is expected. Please start watering now to protect crop yield.'
          : 'నేల ఎండిపోయింది మరియు వర్షం లేదు. మిర్చి పంట ఆరోగ్యంగా ఉండటానికి ఇప్పుడే నీరు పెట్టాలి.';
      setMessages((prev) => [...prev, { role: 'assistant', text: fallback }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-violet-300">
          {lang === 'te'
            ? '🤖 AI మిత్ర · మీ వ్యవసాయ సహాయకుడు'
            : lang === 'hi'
            ? '🤖 AI मित्र · आपका कृषि सहायक'
            : '🤖 AI Mitra · Your Farm Assistant'}
        </span>
        <span className="text-[11px] text-emerald-300 font-bold">● 24×7 సహాయం</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLE_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={sending}
            onClick={() => ask(p.text, p.lang)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-500/40 transition"
          >
            {p.text}
          </button>
        ))}
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl leading-relaxed ${
              m.role === 'user'
                ? 'bg-emerald-600 text-white font-semibold ml-8'
                : 'bg-slate-900 border border-slate-800 text-slate-100 mr-4'
            }`}
          >
            {m.text}
          </div>
        ))}
        {sending && (
          <div className="text-emerald-400 font-bold animate-pulse">
            {lang === 'te' ? 'AI మిత్ర సమాధానం సిద్ధం చేస్తోంది...' : 'AI Mitra is replying...'}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input, lang);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            lang === 'te'
              ? 'తెలుగులో మీ ప్రశ్నను అడగండి...'
              : lang === 'hi'
              ? 'अपना सवाल हिंदी में पूछें...'
              : 'Ask about watering, pests, or crop care...'
          }
          className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition"
        >
          {lang === 'te' ? 'పంపు' : lang === 'hi' ? 'भेजें' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

export default AIAssistant;
