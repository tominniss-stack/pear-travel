'use client';

import { useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import Link from 'next/link';
import type { Itinerary } from '@/types';

export default function LedgerTerminal({ trip, initialItinerary }: { trip: any, initialItinerary: Itinerary }) {
  const { displayCurrency, exchangeRate, toggleCurrency, setActualCost, addMiscExpense, removeMiscExpense } = useTripStore();
  const [newExpense, setNewExpense] = useState({ title: '', amountGBP: '', isSunkCost: false });
  const [colorTheme, setColorTheme] = useState<'emerald' | 'red' | 'white'>('emerald');
  
  const itinerary = useTripStore(state => state.itinerary) || initialItinerary;
  const localCurrencyRaw = itinerary?.essentials?.currency || '';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localSymbol === '£' || localCurrencyRaw.includes('GBP');

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return 'N/A';
    if (cost === 0) return '0.00';
    if (displayCurrency === 'LOCAL' && !isDomesticTrip) return `${localSymbol}${(cost * exchangeRate).toFixed(2)}`;
    return `£${cost.toFixed(2)}`;
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amountGBP) return;
    addMiscExpense({
      title: newExpense.title,
      amountGBP: parseFloat(newExpense.amountGBP),
      category: 'Other',
      isSunkCost: newExpense.isSunkCost,
      date: new Date().toISOString()
    });
    setNewExpense({ title: '', amountGBP: '', isSunkCost: false });
  };

  const themeClasses = {
    emerald: { text: 'text-emerald-500', textBright: 'text-emerald-400', border: 'border-emerald-500', bgHover: 'hover:bg-emerald-950/50', accent: 'text-emerald-700', dim: 'border-emerald-900', selection: 'selection:bg-emerald-900 selection:text-emerald-100', hex: '#10b981' },
    red: { text: 'text-red-500', textBright: 'text-red-400', border: 'border-red-500', bgHover: 'hover:bg-red-950/50', accent: 'text-red-700', dim: 'border-red-900', selection: 'selection:bg-red-900 selection:text-red-100', hex: '#ef4444' },
    white: { text: 'text-slate-300', textBright: 'text-white', border: 'border-slate-300', bgHover: 'hover:bg-slate-800/50', accent: 'text-slate-500', dim: 'border-slate-800', selection: 'selection:bg-slate-700 selection:text-white', hex: '#cbd5e1' }
  };

  const c = themeClasses[colorTheme];
  const isOverBudget = (itinerary?.totalEstimatedCostGBP || 0) > trip.budgetGBP;

  return (
    <div className={`w-full min-h-screen bg-black ${c.text} font-mono p-4 md:p-8 ${c.selection} overflow-x-hidden transition-colors duration-300`}>
      
      {/* FORCE GLOBAL BLACKOUT */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html { background-color: #000 !important; color: ${c.hex} !important; }
        header, nav, footer { background-color: #000 !important; border-color: #111 !important; color: ${c.hex} !important; }
        #theme-toggle-button { display: none !important; }
      `}} />

      <div className="max-w-4xl mx-auto pb-32">
        
        {/* TOP CONTROLS */}
        <div className="flex flex-wrap justify-between items-center mb-8 border-b border-dashed pb-4 gap-4">
          <div className="flex gap-3 text-xs tracking-widest">
            <span className="opacity-50">COLOR:</span>
            <button onClick={() => setColorTheme('emerald')} className={`hover:${c.textBright} ${colorTheme === 'emerald' ? c.textBright : c.accent}`}>[GRN]</button>
            <button onClick={() => setColorTheme('red')} className={`hover:${c.textBright} ${colorTheme === 'red' ? c.textBright : c.accent}`}>[RED]</button>
            <button onClick={() => setColorTheme('white')} className={`hover:${c.textBright} ${colorTheme === 'white' ? c.textBright : c.accent}`}>[WHT]</button>
          </div>
          
          <div className="flex gap-4 text-xs tracking-widest">
            <button onClick={toggleCurrency} className={`hover:${c.textBright}`}>[CURRENCY:{displayCurrency}]</button>
            <Link href={`/itinerary/${trip.id}`} className={`hover:${c.textBright}`}>[RETURN_TO_MAIN]</Link>
          </div>
        </div>

        {/* HEADER */}
        <div className="mb-10">
          <div className={`text-xs uppercase tracking-widest mb-1 opacity-70`}>
            executing: ledger_diagnostic.sh --trip={trip.id}
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
            FINANCIAL_LEDGER
          </h1>

          <div className={`border-2 ${c.border} p-4 md:p-6 relative`}>
            <div className="absolute -top-3 left-4 bg-black px-2 text-xs font-bold tracking-widest">
              // DIAGNOSTICS
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className={`${c.accent} mb-1`}>TARGET_CAP:</div>
                <div className="text-2xl">{formatCost(trip.budgetGBP)}</div>
              </div>
              <div>
                <div className={`${c.accent} mb-1`}>NET_EXPOSURE:</div>
                <div className={`text-2xl ${isOverBudget ? 'animate-pulse' : ''}`}>{formatCost(itinerary.totalEstimatedCostGBP)}</div>
              </div>
              <div>
                <div className={`${c.accent} mb-1`}>SYSTEM_STATUS:</div>
                <div className={`text-2xl uppercase ${isOverBudget ? 'text-amber-500' : c.textBright}`}>
                  [{isOverBudget ? 'WARNING_OVER_CAP' : 'NOMINAL'}]
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DAILY LOGS */}
        <div className="space-y-12">
          {itinerary?.days.map(day => (
            <div key={day.dayNumber}>
              <div className="text-xl font-bold mb-4 flex items-center gap-4">
                <span>[DAY_{day.dayNumber.toString().padStart(2, '0')}_LOG]</span>
                <span className={`h-px ${c.dim} bg-current flex-1 opacity-50`} />
                <span className={`text-sm ${c.accent}`}>EST: {formatCost(day.estimatedDailySpendGBP)}</span>
              </div>

              <div className="space-y-2 text-sm">
                {day.entries.map((e, i) => (
                  <div key={i} className={`flex flex-col md:flex-row md:items-end justify-between gap-2 p-2 -mx-2 ${c.bgHover} transition-colors group`}>
                    <div className="flex-1 truncate pr-4">
                      <span className="opacity-50 mr-2">{'>'}</span>
                      <span className={c.textBright}>{e.locationName}</span>
                      <span className="hidden md:inline text-current opacity-30 tracking-[0.2em] ml-2">
                        .......................................................................
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0 text-xs md:text-sm pl-4 md:pl-0">
                      <span className={`${c.accent}`}>
                        EST: {formatCost(e.estimatedCostGBP)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>ACT:</span>
                        <span className="opacity-50">[</span>
                        <span className="text-current">{displayCurrency === 'GBP' ? '£' : localSymbol}</span>
                        <input
                          type="number"
                          value={e.actualCostGBP || ''}
                          onChange={(ev) => setActualCost(day.dayNumber, e.id, ev.target.value ? parseFloat(ev.target.value) : undefined)}
                          className={`w-16 bg-transparent border-b ${c.accent} focus:border-current focus:outline-none text-right font-bold ${c.textBright} placeholder-${c.accent}/30`}
                          placeholder="____"
                        />
                        <span className="opacity-50">]</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* MISC TRANSACTIONS */}
          <div className="pt-8">
            <div className="text-xl font-bold mb-4 flex items-center gap-4">
              <span>[UNALLOCATED_TRANSACTIONS]</span>
              <span className={`h-px ${c.dim} bg-current flex-1 opacity-50`} />
            </div>

            {/* Form */}
            <form onSubmit={handleAddExpense} className={`border border-dashed ${c.dim} p-4 mb-6 flex flex-wrap gap-4 items-end`}>
              <div className="flex-1 min-w-[200px]">
                <label className={`block text-[10px] ${c.accent} uppercase tracking-widest mb-2`}>{'>'} DESC</label>
                <div className="flex items-center gap-2">
                  <span className="opacity-50">[</span>
                  <input required type="text" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className={`w-full bg-transparent border-b ${c.accent} focus:border-current focus:outline-none ${c.textBright}`} placeholder="e.g. TAXI_FARE" />
                  <span className="opacity-50">]</span>
                </div>
              </div>
              <div className="w-32">
                <label className={`block text-[10px] ${c.accent} uppercase tracking-widest mb-2`}>{'>'} AMT(£)</label>
                <div className="flex items-center gap-2">
                  <span className="opacity-50">[</span>
                  <input required type="number" step="0.01" value={newExpense.amountGBP} onChange={e => setNewExpense({...newExpense, amountGBP: e.target.value})} className={`w-full bg-transparent border-b ${c.accent} focus:border-current focus:outline-none ${c.textBright}`} placeholder="0.00" />
                  <span className="opacity-50">]</span>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-1">
                <input type="checkbox" checked={newExpense.isSunkCost} onChange={e => setNewExpense({...newExpense, isSunkCost: e.target.checked})} className="accent-current" />
                <span className="text-xs uppercase tracking-widest">SUNK_COST</span>
              </label>
              <button type="submit" className={`border border-current px-4 py-1.5 text-xs uppercase tracking-widest hover:bg-current hover:text-black transition-colors font-bold`}>
                [ APPEND ]
              </button>
            </form>

            {/* List */}
            <div className="space-y-2 text-sm">
              {itinerary?.miscExpenses?.map(expense => (
                <div key={expense.id} className={`flex justify-between items-center p-2 -mx-2 ${c.bgHover} transition-colors group`}>
                  <div>
                    <span className="opacity-50 mr-2">{'>'}</span>
                    <span className={c.textBright}>{expense.title}</span>
                    {expense.isSunkCost && <span className="ml-3 text-[10px] bg-red-950/50 text-red-500 border border-red-900 px-1.5 py-0.5">ERR: SUNK_COST</span>}
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-bold">{formatCost(expense.amountGBP)}</span>
                    <button onClick={() => removeMiscExpense(expense.id)} className={`text-red-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity`}>
                      [ DEL ]
                    </button>
                  </div>
                </div>
              ))}
              {(!itinerary?.miscExpenses || itinerary.miscExpenses.length === 0) && (
                <div className={`text-xs ${c.accent} italic`}>0 RECORDS FOUND.</div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className={`mt-16 text-center text-xs opacity-50 border-t ${c.dim} pt-4 flex justify-between`}>
          <span>EOF // SCRIPT_TERMINATED</span>
          <span className="animate-pulse">█</span>
        </div>

      </div>
    </div>
  );
}