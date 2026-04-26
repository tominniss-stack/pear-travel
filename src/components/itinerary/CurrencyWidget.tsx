'use client';

import { useTripStore } from '@/store/tripStore';

export function CurrencyWidget() {
  const { displayCurrency, toggleCurrency, exchangeRate, itinerary } = useTripStore();
  
  // Safely extract the currency symbol (e.g., "€" from "€ EUR")
  const localSymbol = itinerary?.essentials?.currency?.split(' ')[0] || '€';

  // Don't render if there's no trip loaded
  if (!itinerary) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-full shadow-lg p-2 pl-6 transition-transform hover:-translate-y-1">
      <div className="flex flex-col">
        <span className="text-[9px] font-medium uppercase text-zinc-500 tracking-widest">Exchange Rate</span>
        <span className="text-xs font-medium text-zinc-900 dark:text-white tabular-nums">
          £1.00 = {localSymbol}{exchangeRate.toFixed(2)}
        </span>
      </div>
      <button 
        type="button"
        onClick={toggleCurrency}
        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white px-5 py-2.5 rounded-full text-xs font-medium transition-colors cursor-pointer ml-2"
      >
        VIEW IN {displayCurrency === 'GBP' ? 'LOCAL' : 'GBP'}
      </button>
    </div>
  );
}