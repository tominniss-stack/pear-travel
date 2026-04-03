'use client';

import { useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Itinerary, MiscExpense } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

export default function LedgerNotebook({ trip, initialItinerary }: { trip: any, initialItinerary: Itinerary }) {
  const { displayCurrency, exchangeRate, toggleCurrency, setActualCost, addMiscExpense, removeMiscExpense } = useTripStore();
  const [newExpense, setNewExpense] = useState({ title: '', amountGBP: '', isSunkCost: false });
  
  const itinerary = useTripStore(state => state.itinerary) || initialItinerary;
  const localCurrencyRaw = itinerary?.essentials?.currency || '';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localSymbol === '£' || localCurrencyRaw.includes('GBP');
  const symbolSpacer = localSymbol.length > 1 ? ' ' : '';

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return '—';
    if (cost === 0) return 'Free';
    if (displayCurrency === 'LOCAL' && !isDomesticTrip) return `${localSymbol}${symbolSpacer}${(cost * exchangeRate).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    return `£${cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
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

  return (
    <div className="min-h-screen font-sans notebook-bg relative text-slate-900 dark:text-white p-6 md:p-12">
      
      <style dangerouslySetInnerHTML={{__html: `
        .notebook-bg {
          background-color: #Fdfbf7;
          background-image: linear-gradient(#e8e4d9 1px, transparent 1px);
          background-size: 100% 2.5rem;
        }
        @media (min-width: 768px) {
          .notebook-bg {
            background-image: linear-gradient(#e8e4d9 1px, transparent 1px), linear-gradient(90deg, #f87171 1px, transparent 1px);
            background-size: 100% 2.5rem, 3rem 100%;
            background-position: 0 0, 3rem 0;
          }
        }
        .dark .notebook-bg {
          background-color: #1a1a1a;
          background-image: linear-gradient(#333 1px, transparent 1px);
        }
        @media (min-width: 768px) {
          .dark .notebook-bg {
            background-image: linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #7f1d1d 1px, transparent 1px);
          }
        }
      `}} />

      <div className="max-w-4xl mx-auto pb-32 relative z-10">
        <Link href={`/itinerary/${trip.id}`} className="font-typewriter text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white mb-8 inline-block">
          ← Back to Journal
        </Link>

        {/* The Clean Receipt / Ledger Form */}
        <div className="bg-[#fcfaf7] dark:bg-[#d1d5db] p-8 md:p-12 shadow-[2px_4px_16px_rgba(0,0,0,0.15)] dark:shadow-[2px_4px_16px_rgba(0,0,0,0.8)] rotate-1 border border-slate-300 dark:border-slate-500 relative">
          <div className="absolute top-0 right-12 w-8 h-12 bg-red-500/20 mix-blend-multiply dark:mix-blend-multiply" />
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b-2 border-slate-800 dark:border-slate-900 pb-6 mb-12 gap-4">
            <h1 className="font-handwriting text-6xl text-slate-900">Expense Ledger</h1>
            <button onClick={toggleCurrency} className="font-typewriter text-[10px] font-bold uppercase tracking-widest border border-slate-600 text-slate-800 px-3 py-1.5 hover:bg-slate-200 transition-colors w-max">
              {displayCurrency === 'GBP' ? 'Show Local' : 'Show GBP'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-16 text-slate-900">
            <div>
              <p className="font-typewriter text-xs text-slate-600 uppercase tracking-widest mb-2">Total Exposure</p>
              <p className="font-handwriting text-5xl text-red-700 -rotate-2 inline-block border-b-2 border-dashed border-red-400">{formatCost(itinerary.totalEstimatedCostGBP)}</p>
            </div>
            <div className="text-right">
              <p className="font-typewriter text-xs text-slate-600 uppercase tracking-widest mb-2">Budget Target</p>
              <p className="font-handwriting text-4xl">{formatCost(trip.budgetGBP)}</p>
            </div>
          </div>

          <div className="space-y-12 relative text-slate-900">
            <div className="absolute left-[2px] top-4 bottom-0 w-0.5 bg-slate-400 border-l-2 border-dotted border-slate-500" />
            
            {itinerary?.days.map(day => (
              <div key={day.dayNumber} className="pl-6 pb-4 relative z-10">
                <h3 className="font-handwriting text-4xl mb-4">
                  Day {day.dayNumber} 
                  <span className="text-xl text-slate-600 ml-4 font-serif italic">— {formatCost(day.estimatedDailySpendGBP)} est.</span>
                </h3>
                
                <div className="flex flex-col font-typewriter text-sm bg-[#f4f0ea] border border-slate-300">
                  {day.entries.map((e, i) => (
                    <div key={i} className="flex flex-col md:flex-row border-b border-slate-300/50 dark:border-slate-400/50 last:border-0">
                      <div className="flex-1 py-3 px-4 border-r border-slate-300/50 dark:border-slate-400/50 truncate opacity-90">
                        {e.locationName}
                      </div>
                      <div className="w-full md:w-32 py-3 px-4 border-r border-slate-300/50 dark:border-slate-400/50 text-slate-500 line-through decoration-slate-400 text-left md:text-right shrink-0">
                        {formatCost(e.estimatedCostGBP)}
                      </div>
                      <div className="w-full md:w-40 py-2 px-4 shrink-0 flex items-center justify-start md:justify-end gap-1">
                        <span className="text-blue-700 font-handwriting text-2xl mt-1">{displayCurrency === 'GBP' ? '£' : localSymbol}</span>
                        <input
                          type="number"
                          placeholder="Actual..."
                          value={e.actualCostGBP || ''}
                          onChange={(ev) => setActualCost(day.dayNumber, e.id, ev.target.value ? parseFloat(ev.target.value) : undefined)}
                          className="w-24 bg-transparent border-b-2 border-blue-300 focus:outline-none focus:border-blue-600 font-handwriting text-2xl text-blue-700 placeholder-blue-300/50 text-left md:text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Misc Expenses Section */}
            <div className="pl-6 pb-4 relative z-10 mt-12">
              <h3 className="font-handwriting text-4xl mb-4">Extra Scribbles (Misc)</h3>
              
              <form onSubmit={handleAddExpense} className="flex flex-wrap gap-4 items-end bg-[#f4f0ea] p-4 rounded border border-slate-300 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block font-typewriter text-[10px] text-slate-500 uppercase tracking-widest mb-1">What was it?</label>
                  <input required type="text" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-400 focus:outline-none focus:border-slate-800 font-handwriting text-2xl text-slate-900" placeholder="e.g. Extra coffees..." />
                </div>
                <div className="w-32">
                  <label className="block font-typewriter text-[10px] text-slate-500 uppercase tracking-widest mb-1">Cost (£)</label>
                  <input required type="number" step="0.01" value={newExpense.amountGBP} onChange={e => setNewExpense({...newExpense, amountGBP: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-400 focus:outline-none focus:border-slate-800 font-handwriting text-2xl text-slate-900" placeholder="0.00" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={newExpense.isSunkCost} onChange={e => setNewExpense({...newExpense, isSunkCost: e.target.checked})} className="accent-slate-800" />
                  <span className="font-typewriter text-xs text-slate-600">Sunk Cost?</span>
                </label>
                <button type="submit" className="bg-slate-800 text-white font-typewriter text-xs uppercase tracking-widest px-4 py-2 hover:bg-slate-700 transition-colors">
                  Add +
                </button>
              </form>

              <div className="space-y-3 font-typewriter text-sm">
                {itinerary?.miscExpenses?.map(expense => (
                  <div key={expense.id} className="flex justify-between items-center border-b border-slate-400/50 pb-2">
                    <div>
                      <span className="opacity-90">{expense.title}</span>
                      {expense.isSunkCost && <span className="ml-3 text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">SUNK COST</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-handwriting text-2xl text-blue-700">{formatCost(expense.amountGBP)}</span>
                      <button onClick={() => removeMiscExpense(expense.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}