'use client';

import { useTripStore } from '@/store/tripStore';

export function CurrencyWidget() {
  const { displayCurrency, toggleCurrency, exchangeRate, itinerary } = useTripStore();
  
  // Safely extract the currency symbol (e.g., "€" from "€ EUR")
  const localSymbol = itinerary?.essentials?.currency?.split(' ')[0] || '€';

  // Don't render if there's no trip loaded
  if (!itinerary) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-4 pr-2 border-b-4 border-b-brand-600 transition-all hover:-translate-y-1">
      <div className="flex flex-col pl-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Exchange Rate</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
          £1.00 = {localSymbol}{exchangeRate.toFixed(2)}
        </span>
      </div>
      <button 
        type="button"
        onClick={toggleCurrency}
        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-lg cursor-pointer"
      >
        VIEW IN {displayCurrency === 'GBP' ? 'LOCAL' : 'GBP'}
      </button>
    </div>
  );
}