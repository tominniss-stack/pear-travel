'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useTripStore } from '@/store/tripStore';
import { fetchTripDocuments } from '@/app/actions/documents';
import ThemeInjector from '@/components/layout/ThemeInjector';
import type { Itinerary, ExpenseCategory, MiscExpense, ItineraryEntry } from '@/types';
import type { DocumentInfo } from '@/components/itinerary/PlaceDetailsModal';
import LedgerEditorial from './LedgerEditorial';
import LedgerNotebook from './LedgerNotebook';
import LedgerTerminal from './LedgerTerminal';

export interface LedgerClientProps {
  trip: any;
  initialItinerary: Itinerary;
}

export interface LedgerState {
  trip: any;
  activeItinerary: Itinerary;
  activeTab: 'timeline' | 'misc';
  setActiveTab: (t: 'timeline' | 'misc') => void;
  documents: DocumentInfo[];
  isAdding: boolean; setIsAdding: (b: boolean) => void;
  newTitle: string; setNewTitle: (s: string) => void;
  newAmount: string; setNewAmount: (s: string) => void;
  newCategory: ExpenseCategory; setNewCategory: (c: ExpenseCategory) => void;
  newIsPrePaid: boolean; setNewIsPrePaid: (b: boolean) => void;
  newDocId: string; setNewDocId: (s: string) => void;
  inputCurrency: 'GBP' | 'LOCAL'; setInputCurrency: (c: 'GBP' | 'LOCAL') => void;
  editingEntryId: string | null; setEditingEntryId: (id: string | null) => void;
  editAmount: string; setEditAmount: (s: string) => void;
  editCurrency: 'GBP' | 'LOCAL'; setEditCurrency: (c: 'GBP' | 'LOCAL') => void;
  editDocId: string; setEditDocId: (s: string) => void;
  localSymbol: string;
  isDomesticTrip: boolean;
  activeLocalCurrency: 'GBP' | 'LOCAL';
  currentFlag: string;
  exchangeRate: number;
  displayCurrency: 'GBP' | 'LOCAL';
  toggleCurrency: () => void;
  totalActiveSpend: number;
  prePaidSpend: number;
  grandTotal: number;
  timelineItems: (ItineraryEntry & { dayNumber: number, appliedCost: number, derivedCategory: ExpenseCategory })[];
  categoryBreakdown: Record<ExpenseCategory, number>;
  formatCost: (gbp: number) => string;
  handleSaveActual: (dayNumber: number, entryId: string) => void;
  handleAddMisc: (e: React.FormEvent) => void;
  removeMiscExpense: (id: string) => void;
  syncLedger: () => void;
}

export function getCurrencyFlag(currencyCode: string | null): string {
  if (!currencyCode) return '💱';
  const flags: Record<string, string> = {
    'EUR': '🇪🇺', 'USD': '🇺🇸', 'JPY': '🇯🇵', 'GBP': '🇬🇧',
    'AUD': '🇦🇺', 'CAD': '🇨🇦', 'CHF': '🇨🇭', 'THB': '🇹🇭',
    'MXN': '🇲🇽', 'AED': '🇦🇪', 'ZAR': '🇿🇦', 'SEK': '🇸🇪',
    'NOK': '🇳🇴', 'DKK': '🇩🇰', 'SGD': '🇸🇬', 'HKD': '🇭🇰',
    'NZD': '🇳🇿', 'KRW': '🇰🇷', 'INR': '🇮🇳', 'BRL': '🇧🇷',
  };
  return flags[currencyCode] || '💱';
}

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Accommodation: 'bg-indigo-500',
  Transit: 'bg-emerald-500',
  Dining: 'bg-amber-500',
  Activities: 'bg-brand-500',
  Shopping: 'bg-pink-500',
  Other: 'bg-slate-400'
};

export default function LedgerClient({ trip, initialItinerary }: LedgerClientProps) {
  const { setItinerary, itinerary: storeItinerary, setActualCost, addMiscExpense, removeMiscExpense, exchangeRate, displayCurrency, toggleCurrency, aestheticPreference } = useTripStore();
  
  useEffect(() => {
    if (!storeItinerary || storeItinerary.id !== initialItinerary.id) {
      setItinerary(initialItinerary);
    }
  }, [initialItinerary, storeItinerary, setItinerary]);

  const activeItinerary = storeItinerary || initialItinerary;
  const [activeTab, setActiveTab] = useState<'timeline' | 'misc'>('timeline');

  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  useEffect(() => {
    fetchTripDocuments(trip.id).then(docs => setDocuments(docs as DocumentInfo[]));
  }, [trip.id]);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Transit');
  const [newIsPrePaid, setNewIsPrePaid] = useState(false);
  const [newDocId, setNewDocId] = useState<string>('');
  const [inputCurrency, setInputCurrency] = useState<'GBP' | 'LOCAL'>('LOCAL');

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState<'GBP' | 'LOCAL'>('LOCAL');
  const [editDocId, setEditDocId] = useState<string>('');

  const localCurrencyRaw = activeItinerary.essentials?.currency || '';
  const targetCurrency = localCurrencyRaw.match(/[A-Z]{3}/)?.[0] || null;
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localSymbol === '£' || localCurrencyRaw.includes('GBP');
  const activeLocalCurrency = isDomesticTrip ? 'GBP' : 'LOCAL';
  const currentFlag = getCurrencyFlag(targetCurrency);

  const syncLedger = () => {
    setTimeout(async () => {
      const latestItinerary = useTripStore.getState().itinerary;
      if (!latestItinerary) return;
      try {
        await fetch(`/api/trip/${trip.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itinerary: latestItinerary })
        });
      } catch (error) {
        console.error("Failed to persist ledger state to database:", error);
      }
    }, 50); 
  };

  const { totalActiveSpend, prePaidSpend, grandTotal, timelineItems, categoryBreakdown } = useMemo(() => {
    let activeTimelineSpend = 0;
    const items: (ItineraryEntry & { dayNumber: number, appliedCost: number, derivedCategory: ExpenseCategory })[] = [];
    const breakdown: Record<ExpenseCategory, number> = { Accommodation: 0, Transit: 0, Dining: 0, Activities: 0, Shopping: 0, Other: 0 };

    activeItinerary.days.forEach(day => {
      day.entries.forEach(entry => {
        if (entry.transitMethod === 'Start of Day') return; 
        
        const isAccommodation = 
          entry.type === 'ACCOMMODATION' ||
          /(accommodation|hotel|airbnb|return to)/i.test(entry.locationName || '') ||
          /(accommodation|hotel|airbnb|return to)/i.test(entry.activityDescription || '');
        if (isAccommodation && entry.estimatedCostGBP === 0 && !entry.actualCostGBP) return;
        
        const cost = entry.actualCostGBP !== undefined ? entry.actualCostGBP : entry.estimatedCostGBP;
        activeTimelineSpend += cost;
        
        let derivedCategory: ExpenseCategory = 'Activities';
        if (entry.isDining) derivedCategory = 'Dining';
        else if (entry.type === 'TRAVEL' || entry.transitMethod !== 'Walking') derivedCategory = 'Transit';
        else if (isAccommodation) derivedCategory = 'Accommodation';
        
        breakdown[derivedCategory] += cost;
        items.push({ ...entry, dayNumber: day.dayNumber, appliedCost: cost, derivedCategory });
      });
    });

    let activeMiscSpend = 0;
    let prePaid = 0;
    (activeItinerary.miscExpenses || []).forEach((exp: MiscExpense) => {
      if (exp.isSunkCost) prePaid += exp.amountGBP;
      else activeMiscSpend += exp.amountGBP;
      breakdown[exp.category] += exp.amountGBP;
    });

    const active = activeTimelineSpend + activeMiscSpend;
    
    return {
      totalActiveSpend: active,
      prePaidSpend: prePaid,
      grandTotal: active + prePaid,
      timelineItems: items,
      categoryBreakdown: breakdown
    };
  }, [activeItinerary]);

  const formatCost = (gbp: number) => {
    if (displayCurrency === 'LOCAL' && !isDomesticTrip) {
      return `${localSymbol}${(gbp * exchangeRate).toFixed(2)}`;
    }
    return `£${gbp.toFixed(2)}`;
  };

  const handleSaveActual = (dayNumber: number, entryId: string) => {
    let amountInGBP = parseFloat(editAmount);
    if (isNaN(amountInGBP)) amountInGBP = 0;
    if (editCurrency === 'LOCAL' && !isDomesticTrip) {
       amountInGBP = amountInGBP / exchangeRate;
    }
    setActualCost(dayNumber, entryId, amountInGBP, editDocId || undefined);
    syncLedger(); 
    setEditingEntryId(null);
    setEditAmount('');
    setEditDocId('');
  };

  const handleAddMisc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAmount) return;
    let amountInGBP = parseFloat(newAmount);
    if (inputCurrency === 'LOCAL' && !isDomesticTrip) {
       amountInGBP = amountInGBP / exchangeRate;
    }
    addMiscExpense({
      title: newTitle,
      amountGBP: amountInGBP,
      category: newCategory,
      isSunkCost: newIsPrePaid, 
      linkedDocumentId: newDocId || undefined,
      date: new Date().toISOString()
    });
    syncLedger(); 
    setIsAdding(false);
    setNewTitle(''); setNewAmount(''); setNewDocId(''); setNewIsPrePaid(false);
  };

  // ── Package all state to send to the Renderers ──
  const ledgerState: LedgerState = {
    trip, activeItinerary, activeTab, setActiveTab, documents,
    isAdding, setIsAdding, newTitle, setNewTitle, newAmount, setNewAmount,
    newCategory, setNewCategory, newIsPrePaid, setNewIsPrePaid, newDocId, setNewDocId,
    inputCurrency, setInputCurrency, editingEntryId, setEditingEntryId,
    editAmount, setEditAmount, editCurrency, setEditCurrency, editDocId, setEditDocId,
    localSymbol, isDomesticTrip, activeLocalCurrency, currentFlag, exchangeRate, displayCurrency,
    toggleCurrency, totalActiveSpend, prePaidSpend, grandTotal, timelineItems, categoryBreakdown,
    formatCost, handleSaveActual, handleAddMisc, removeMiscExpense, syncLedger
  };
  
 if (aestheticPreference === 'TERMINAL') {
    return (
      <div className="min-h-screen bg-black font-mono pb-32">
        <LedgerTerminal trip={trip} initialItinerary={activeItinerary} />
      </div>
    );
  }
  
if (aestheticPreference === 'NOTEBOOK') {
    return (
      <div className="min-h-screen pb-32">
        <ThemeInjector />
        <LedgerNotebook trip={trip} initialItinerary={activeItinerary} />
      </div>
    );
  }

  if (aestheticPreference === 'EDITORIAL') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-32">
        <ThemeInjector />
        <LedgerEditorial ledger={ledgerState} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-32">
      <ThemeInjector />
      <LedgerClassic ledger={ledgerState} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC LEDGER (V1 FALLBACK UI)
// ─────────────────────────────────────────────────────────────────────────────
function LedgerClassic({ ledger }: { ledger: LedgerState }) {
  const { trip, activeItinerary, activeTab, setActiveTab, documents, isAdding, setIsAdding, newTitle, setNewTitle, newAmount, setNewAmount, newCategory, setNewCategory, newIsPrePaid, setNewIsPrePaid, newDocId, setNewDocId, inputCurrency, setInputCurrency, editingEntryId, setEditingEntryId, editAmount, setEditAmount, editCurrency, setEditCurrency, editDocId, setEditDocId, localSymbol, isDomesticTrip, activeLocalCurrency, currentFlag, exchangeRate, displayCurrency, toggleCurrency, totalActiveSpend, prePaidSpend, grandTotal, timelineItems, categoryBreakdown, formatCost, handleSaveActual, handleAddMisc, removeMiscExpense, syncLedger } = ledger;

  return (
    <>
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/itinerary/${trip.id}`} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 font-bold transition-colors shadow-inner">
              ←
            </Link>
            <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl leading-none">💳</span> Expense Ledger
            </h1>
          </div>
          
          {!isDomesticTrip && (
            <button 
              onClick={toggleCurrency}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <span className="text-sm leading-none">{displayCurrency === 'GBP' ? '🇬🇧' : currentFlag}</span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden sm:block">
                Viewing {displayCurrency === 'GBP' ? 'GBP' : 'LOCAL'}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="w-full lg:w-[340px] flex-shrink-0 lg:sticky lg:top-28 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm min-w-0">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Daily Fund (Pocket Money)</h3>
              <div className="flex items-end gap-2 mb-4 min-w-0">
                <span className={`text-4xl md:text-5xl font-black tracking-tighter truncate ${totalActiveSpend > trip.budgetGBP ? 'text-red-500' : 'text-slate-900 dark:text-white'}`} title={formatCost(totalActiveSpend)}>
                  {formatCost(totalActiveSpend)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Spent</span>
                <span>{formatCost(trip.budgetGBP)} Limit</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-1000 ${totalActiveSpend > trip.budgetGBP ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min((totalActiveSpend / trip.budgetGBP) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Spend by Category</h3>
              <div className="flex h-3 w-full rounded-full overflow-hidden mb-5 bg-slate-100 dark:bg-slate-800 shadow-inner gap-[1px]">
                {Object.entries(categoryBreakdown).map(([cat, amount]) => {
                  if (amount === 0) return null;
                  return <div key={cat} className={`h-full ${CATEGORY_COLORS[cat as ExpenseCategory]}`} style={{ width: `${(amount / grandTotal) * 100}%` }} title={`${cat}: ${formatCost(amount)}`} />
                })}
              </div>
              <div className="flex flex-col gap-3">
                {Object.entries(categoryBreakdown).filter(([_, amount]) => amount > 0).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat as ExpenseCategory]}`} />
                      <span className="font-bold text-slate-700 dark:text-slate-300">{cat}</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums">{formatCost(amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 md:p-8 shadow-xl text-white border border-slate-800 relative overflow-hidden min-w-0">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 min-w-0">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Grand Total</h3>
                <div className="text-3xl md:text-4xl font-black tracking-tighter mb-2 truncate" title={formatCost(grandTotal)}>{formatCost(grandTotal)}</div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4 border-b border-slate-800 pb-4">Includes {formatCost(prePaidSpend)} in pre-paid / advance expenses.</p>
                <div className="flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <p className="text-[10px] text-slate-500 leading-tight">* Conversions estimated at <strong className="text-slate-400">£1 = {localSymbol}{exchangeRate.toFixed(2)}</strong>.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col gap-6 min-w-0">
            <div className="flex gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-max border border-slate-200/50 dark:border-slate-700/50">
              <button onClick={() => setActiveTab('timeline')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'timeline' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Itinerary Timeline</button>
              <button onClick={() => setActiveTab('misc')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'misc' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Pre-paid & Misc {(activeItinerary.miscExpenses?.length || 0) > 0 && <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px]">{activeItinerary.miscExpenses?.length}</span>}</button>
            </div>

            {activeTab === 'timeline' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Planned Activities</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="p-5 flex flex-col hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0 pr-4">
                          <div className="flex gap-2 items-center mb-1">
                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest block">Day {item.dayNumber}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{item.derivedCategory}</span>
                            {item.linkedDocumentId && <span className="text-xs" title="Receipt Attached">📎</span>}
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">{item.locationName}</p>
                        </div>
                        {editingEntryId !== item.id && (
                          <button onClick={() => { setEditingEntryId(item.id); setEditCurrency(activeLocalCurrency); setEditAmount(activeLocalCurrency === 'LOCAL' && !isDomesticTrip ? (item.appliedCost * exchangeRate).toFixed(2) : item.appliedCost.toFixed(2)); setEditDocId(item.linkedDocumentId || ''); }} className={`px-5 py-2.5 rounded-xl border text-sm font-bold transition-all w-full sm:w-auto text-left sm:text-right flex-shrink-0 whitespace-nowrap cursor-pointer ${item.actualCostGBP !== undefined ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 hover:shadow-sm'}`}>
                            <span className="opacity-60 font-medium mr-1">{item.actualCostGBP !== undefined ? 'Actual:' : 'Est:'}</span> {formatCost(item.appliedCost)}
                          </button>
                        )}
                      </div>
                      {editingEntryId === item.id && (
                        <div className="mt-4 p-4 md:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in shadow-inner">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">Log Actual Cost</h4>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                            <div className="flex-1 min-w-0">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Amount</label>
                              <div className="flex items-stretch bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 shadow-sm">
                                {!isDomesticTrip && <button onClick={() => setEditCurrency(editCurrency === 'LOCAL' ? 'GBP' : 'LOCAL')} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors border-r border-slate-300 dark:border-slate-600 cursor-pointer flex-shrink-0">{editCurrency === 'LOCAL' ? localSymbol : '£'}</button>}
                                {isDomesticTrip && <span className="px-4 py-2.5 text-xs font-black text-slate-500 border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0">£</span>}
                                <input type="number" step="0.01" autoFocus value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="flex-1 min-w-0 px-4 py-2.5 bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none tabular-nums" placeholder="0.00" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Attach Receipt</label>
                              <select value={editDocId} onChange={(e) => setEditDocId(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white shadow-sm">
                                <option value="">No Receipt</option>
                                {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0">
                              <button onClick={() => handleSaveActual(item.dayNumber, item.id)} className="flex-1 sm:flex-none bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform shadow-md">Save</button>
                              <button onClick={() => setEditingEntryId(null)} className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors shadow-sm">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'misc' && (
              <div className="flex flex-col gap-6">
                {!isAdding ? (
                  <button onClick={() => setIsAdding(true)} className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-slate-500 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"><span className="text-xl leading-none mb-0.5">+</span> Log Manual / Pre-paid Expense</button>
                ) : (
                  <form onSubmit={handleAddMisc} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Log Expense</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                        <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. British Airways Flights" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Amount</label>
                        <div className="flex items-stretch bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
                          {!isDomesticTrip && <button type="button" onClick={() => setInputCurrency(inputCurrency === 'LOCAL' ? 'GBP' : 'LOCAL')} className="px-5 py-3 bg-slate-200 dark:bg-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors border-r border-slate-300 dark:border-slate-600 cursor-pointer flex-shrink-0">{inputCurrency === 'LOCAL' ? localSymbol : '£'}</button>}
                          {isDomesticTrip && <span className="px-5 py-3 text-xs font-black text-slate-500 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0">£</span>}
                          <input type="number" step="0.01" required value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" className="flex-1 w-full min-w-0 px-4 py-3 bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none tabular-nums" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white cursor-pointer">
                          <option value="Transit">Transit</option><option value="Dining">Dining</option><option value="Activities">Activities</option><option value="Accommodation">Accommodation</option><option value="Shopping">Shopping</option><option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Attach Receipt</label>
                         <select value={newDocId} onChange={(e) => setNewDocId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white cursor-pointer">
                           <option value="">No Receipt</option>
                           {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                         </select>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                      <input type="checkbox" id="prePaidToggle" checked={newIsPrePaid} onChange={(e) => setNewIsPrePaid(e.target.checked)} className="w-5 h-5 rounded text-brand-500 mt-0.5 cursor-pointer" />
                      <div>
                        <label htmlFor="prePaidToggle" className="font-bold text-sm text-slate-900 dark:text-white cursor-pointer block mb-1">Mark as Pre-paid / Advance Expense</label>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-lg">Check this for major pre-paid items (Flights, Hotels). It adds to your Grand Total, but won't drain your daily spending fund.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                      <button type="button" onClick={() => setIsAdding(false)} className="flex-1 sm:flex-none sm:w-32 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                      <button type="submit" className="flex-[2] sm:flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform">Save Expense</button>
                    </div>
                  </form>
                )}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  {(activeItinerary.miscExpenses || []).length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center">
                      <span className="text-4xl mb-3 opacity-50">🧾</span><p className="text-slate-500 font-medium">No manual expenses logged yet.</p>
                    </div>
                  ) : (
                    (activeItinerary.miscExpenses || []).map((exp: MiscExpense) => (
                      <div key={exp.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <div className="min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">{exp.title}</span>
                            {exp.isSunkCost && <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-sm">Pre-paid</span>}
                            {exp.linkedDocumentId && <span className="text-sm" title="Receipt attached">📎</span>}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{exp.category}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto flex-shrink-0">
                          <span className="font-black text-slate-900 dark:text-white text-lg tabular-nums">{formatCost(exp.amountGBP)}</span>
                          <button onClick={() => { removeMiscExpense(exp.id); syncLedger(); }} className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors flex-shrink-0 shadow-sm cursor-pointer">🗑</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}