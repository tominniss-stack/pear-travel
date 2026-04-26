'use client';

import { useState, useTransition } from 'react';
import { LayoutTemplate, Newspaper, BookOpen, TerminalSquare, CheckCircle2 } from 'lucide-react';
import { updateUserAestheticPreferenceAction } from '@/app/actions/profile';

const THEMES = [
  { id: 'CLASSIC',   label: 'Classic',   icon: LayoutTemplate },
  { id: 'EDITORIAL', label: 'Editorial', icon: Newspaper },
  { id: 'NOTEBOOK',  label: 'Notebook',  icon: BookOpen },
  { id: 'TERMINAL',  label: 'Terminal',  icon: TerminalSquare },
] as const;

export function ThemeShowcase({ initialPreference = 'CLASSIC' }: { initialPreference?: string }) {
  const [selected, setSelected] = useState<string>(initialPreference);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSelect = (id: string) => {
    setSelected(id);
    setSaved(false);
    startTransition(async () => {
      await updateUserAestheticPreferenceAction(id);
      setSaved(true);
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* 1. Mobile-Optimized Selector Row */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {THEMES.map((theme) => {
          const Icon = theme.icon;
          const isActive = selected === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              className={`
                flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl border transition-all
                ${isActive
                  ? 'bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-100'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
              `}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`} />
              <span className={`text-[9px] sm:text-xs font-semibold ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                {theme.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. The Preview Window */}
      <div className="p-4 sm:p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden relative min-h-[240px] flex items-center justify-center">

        {/* CLASSIC PREVIEW */}
        {selected === 'CLASSIC' && (
          <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm font-sans animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] sm:text-xs font-bold tracking-wider text-zinc-900 dark:text-white uppercase">Day 1</span>
              <span className="text-[10px] sm:text-xs text-zinc-500">Paris, FR</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-2">Check-in &amp; Exploration</h3>
            <div className="flex gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 border-l-2 border-zinc-900 dark:border-zinc-100 pl-3">
              <span className="font-semibold text-zinc-900 dark:text-zinc-300">14:00</span>
              <span>Arrive at Le Meurice</span>
            </div>
          </div>
        )}

        {/* EDITORIAL PREVIEW */}
        {selected === 'EDITORIAL' && (
          <div className="w-full max-w-sm sm:max-w-md bg-[#faf9f6] dark:bg-zinc-900 border-t-4 border-black dark:border-white p-4 sm:p-6 font-serif animate-fade-in shadow-md">
            <h2 className="text-2xl sm:text-3xl italic text-black dark:text-white mb-1">Arrival</h2>
            <p className="text-[9px] sm:text-xs tracking-[0.2em] uppercase text-zinc-500 mb-4 sm:mb-6 border-b border-zinc-300 dark:border-zinc-700 pb-2">Chapter One — Paris</p>
            <div className="flex justify-between items-baseline">
              <span className="text-base sm:text-lg text-black dark:text-white">Le Meurice</span>
              <span className="text-xs sm:text-sm italic text-zinc-500">14:00</span>
            </div>
          </div>
        )}

        {/* NOTEBOOK PREVIEW */}
        {selected === 'NOTEBOOK' && (
          <div
            className="w-full max-w-sm sm:max-w-md bg-[#fdfbf7] border border-zinc-300 p-4 sm:p-5 font-sans animate-fade-in rotate-2 shadow-md"
            style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          >
            <div className="border-b-2 border-red-400/50 pb-2 mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-zinc-800">📍 Day 1: Paris!</h3>
            </div>
            <div className="bg-yellow-100 p-2 sm:p-3 rounded text-xs sm:text-sm text-zinc-700 shadow-sm -rotate-2 w-11/12">
              <strong>14:00</strong> — Hotel check in (don&apos;t forget passports)
            </div>
          </div>
        )}

        {/* TERMINAL PREVIEW */}
        {selected === 'TERMINAL' && (
          <div className="w-full max-w-sm sm:max-w-md bg-[#0a0a0a] border border-zinc-800 p-4 sm:p-5 font-mono animate-fade-in shadow-xl rounded-md">
            <div className="flex gap-1.5 sm:gap-2 mb-4">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
            <p className="text-green-400 text-[10px] sm:text-xs mb-2">$ ./load_itinerary --day=1 --loc=PARIS</p>
            <p className="text-zinc-400 text-xs sm:text-sm mb-1">[14:00] <span className="text-white">SYS.EVENT:</span> Check-in</p>
            <p className="text-zinc-500 text-[10px] sm:text-xs">&gt; Target: Le Meurice</p>
          </div>
        )}
      </div>

      {/* Save Status */}
      <div className="h-6 flex items-center justify-center">
        {isPending && (
          <span className="text-xs sm:text-sm text-zinc-500 animate-pulse">Saving preference...</span>
        )}
        {saved && !isPending && (
          <span className="text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved as default
          </span>
        )}
      </div>
    </div>
  );
}
