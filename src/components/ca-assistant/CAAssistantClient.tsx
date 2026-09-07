'use client';

import { useState } from 'react';
import { BotMessageSquare } from 'lucide-react';

export default function CAAssistantClient({
  businessId,
  role,
}: {
  businessId: string;
  role: string;
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hello. I am your CA Assistant. Ask me about your business data, or request a draft action (e.g., "Suggest a draft invoice for Customer X"). All action suggestions require your confirmation before posting.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    try {
      const res = await fetch('/api/ca-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          businessId,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 300) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Something went wrong.'}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message + (data.requires_confirmation ? ' [Requires your confirmation before any action is finalized.]' : ''),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Could not connect to assistant.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-6 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/40 border border-white/[0.06] shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] rounded-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <BotMessageSquare className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">CA Assistant</h2>
          <p className="text-[11px] text-indigo-300/80 font-medium">Financial Intelligence Copilot</p>
        </div>
      </div>
      <div className="h-[52vh] overflow-y-auto space-y-3 p-1">
        {messages.map((m, i) => (
          <div key={i} className={`group relative ${m.role === 'user' ? 'ml-auto' : ''}`}>
            <div className={`inline-block max-w-[92%] md:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${m.role === 'user' ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-md' : 'bg-slate-800/60 text-gray-100 border border-white/[0.06] rounded-tl-md'}`}>
              <p className="font-semibold text-[10px] uppercase tracking-wider text-indigo-300/80 mb-2">{m.role === 'user' ? 'You' : 'CA Copilot'}</p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="inline-block max-w-[75%] p-4 rounded-2xl bg-slate-800/60 border border-white/[0.06] shadow-sm">
            <p className="text-xs text-indigo-300 animate-pulse">Analyzing business data...</p>
          </div>
        )}
      </div>
      <form className="flex gap-3 items-end" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Ask about sales, expenses, customers, balances... (Shift+Enter = new line)"
          className="flex-1 bg-slate-950/40 border border-white/[0.08] text-white px-4 py-3 rounded-xl text-sm min-h-[48px] resize-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
          rows={2}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-[48px] px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
      <p className="text-[11px] text-slate-500 flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse"></span>
        AI guidance only. Confirm all draft actions before posting. Not legal or tax advice.
      </p>
    </div>
  );
}
