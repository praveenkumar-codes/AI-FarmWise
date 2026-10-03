import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { farmService } from '../../services/farmService.js';

const SAMPLE_QUESTIONS = [
  { lang: 'en', text: 'Should I irrigate today?' },
  { lang: 'te', text: 'ఈ రోజు నీరు పెట్టాలా?' },
  { lang: 'hi', text: 'क्या मुझे आज पानी देना चाहिए?' },
];

export function AssistantDrawer({ isOpen, onClose, dashboard }) {
  const { lang, setLang, t } = useLanguage();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      lang: 'en',
      text: 'Hello! I am your AI FarmWise Agronomist. Click a sample question below or ask anything about your Rice crop, live ESP32 soil moisture, or pending approvals.',
    },
  ]);

  if (!isOpen) return null;

  const sendQuestion = async (questionText, targetLang = lang) => {
    const trimmed = (questionText || '').trim();
    if (!trimmed || sending) return;

    if (targetLang && targetLang !== lang) {
      setLang(targetLang);
    }

    setMessages((prev) => [...prev, { role: 'user', lang: targetLang, text: trimmed }]);
    setInput('');
    setSending(true);

    try {
      const res = await farmService.chatWithAssistant(trimmed, targetLang || lang);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          lang: res.language || targetLang,
          text: res.reply,
          context: res.context_summary,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          lang: targetLang,
          text: 'Error contacting AI Assistant: ' + (err.message || 'Unknown error'),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input, lang);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <h3 className="text-sm font-bold text-emerald-400">
              {t.assistant?.title || 'AI FarmWise Agronomist Assistant'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t.assistant?.subtitle || 'Grounded in live ESP32 telemetry & Open-Meteo'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            ✕ Close
          </button>
        </div>

        {/* Live Context Bar */}
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center gap-3 text-[11px] text-slate-300 font-mono">
          <span>
            Moisture: <strong>{dashboard?.telemetry?.soil_moisture?.toFixed(1) ?? '18.5'}%</strong>
          </span>
          <span>
            Temp: <strong>{dashboard?.telemetry?.soil_temperature?.toFixed(1) ?? '27.5'}°C</strong>
          </span>
          <span>
            Rain Prob: <strong>{dashboard?.weather?.precip_prob ?? 5}%</strong>
          </span>
          <span>
            Pending: <strong>{(dashboard?.pending_actions || []).length}</strong>
          </span>
        </div>

        {/* Quick Sample Questions (EN / TE / HI) */}
        <div className="p-3 border-b border-slate-800 bg-slate-950 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Quick Jury Sample Questions (Click to Ask):
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={sending}
                onClick={() => sendQuestion(q.text, q.lang)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition text-left"
              >
                {q.text}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Transcript */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="text-xs text-slate-400 font-mono animate-pulse">
              AI Agronomist is analyzing live ESP32 & weather telemetry...
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-slate-800 bg-slate-900/70 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              t.assistant?.placeholder || 'Ask about irrigation, soil moisture, or NPK...'
            }
            className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition"
          >
            {t.assistant?.send || 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AssistantDrawer;
