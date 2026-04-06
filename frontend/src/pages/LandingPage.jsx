import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { useEffect } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  const token = useStore(s => s.token);

  useEffect(() => {
    if (token) navigate('/app');
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <span className="text-[#a3e635] text-xl font-bold">✦</span>
          <span className="font-bold tracking-widest text-sm uppercase">Atomic Bot</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-10 h-10 rounded-full border border-[#2a2a2a] flex items-center justify-center text-gray-400 hover:border-[#a3e635] hover:text-white transition-all"
        >
          <svg width="16" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="0" y1="2" x2="16" y2="2"/>
            <line x1="0" y1="6" x2="16" y2="6"/>
            <line x1="0" y1="10" x2="16" y2="10"/>
          </svg>
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-5xl sm:text-7xl font-black uppercase leading-none tracking-tight mb-6">
          <span className="block">RUN 🦞</span>
          <span className="block text-[#a3e635]">OPENCLAW</span>
          <span className="block">IN ONE CLICK</span>
        </h1>
        <p className="text-gray-400 text-lg mb-10 max-w-md">
          One click and your AI assistant is live 24/7
        </p>
        <button
          onClick={() => navigate('/register')}
          className="bg-[#a3e635] text-black font-bold text-lg px-10 py-4 rounded-2xl hover:bg-[#bef264] transition-all flex items-center gap-3 pulse-green"
        >
          <span className="text-xl">✦</span>
          Run in Cloud
        </button>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon: '🤖', title: 'Free AI Models', desc: 'OpenRouter, HuggingFace & Mistral free models' },
            { icon: '⚡', title: 'Cron Jobs', desc: 'Automate tasks on any schedule' },
            { icon: '🔌', title: 'Connectors', desc: 'Connect Telegram, Discord, Gmail and more' },
          ].map(f => (
            <div key={f.title} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 text-left hover:border-[#2a2a2a] transition-all">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="font-semibold mb-1">{f.title}</div>
              <div className="text-gray-500 text-sm">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Demo mockup */}
        <div className="mt-16 w-full max-w-2xl bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f1f]">
            <div className="w-3 h-3 rounded-full bg-red-500/70"/>
            <div className="w-3 h-3 rounded-full bg-yellow-500/70"/>
            <div className="w-3 h-3 rounded-full bg-green-500/70"/>
            <span className="ml-2 text-xs text-gray-500 font-mono">✦ ATOMIC BOT</span>
          </div>
          <div className="p-6 text-left">
            <div className="text-gray-500 text-sm mb-3">turn this into tasks for me and my team</div>
            <div className="text-sm text-white">
              <div className="text-gray-400 mb-2">Sure! Plan:</div>
              <ul className="space-y-1 text-gray-300">
                <li>• extract requirements and acceptance criteria</li>
                <li>• break them into tasks with priority (P0/P1/P2)</li>
                <li>• add dependencies and owner placeholders</li>
                <li>• create timeline with milestones</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-gray-600 text-sm border-t border-[#1a1a1a]">
        © 2025 Atomic Bot — Powered by free AI models
      </footer>
    </div>
  );
}
