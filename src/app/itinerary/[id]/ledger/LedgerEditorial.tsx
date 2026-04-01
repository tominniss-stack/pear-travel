'use client';

import Link from 'next/link';
import type { LedgerState } from './LedgerClient';
import type { MiscExpense } from '@/types';

export default function LedgerEditorial({ ledger }: { ledger: LedgerState }) {
  const { 
    trip, 
    activeItinerary,
    activeTab, 
    setActiveTab, 
    documents, 
    isAdding, 
    setIsAdding, 
    newTitle, 
    setNewTitle, 
    newAmount, 
    setNewAmount, 
    newCategory, 
    setNewCategory, 
    newIsPrePaid, 
    setNewIsPrePaid, 
    newDocId, 
    setNewDocId, 
    inputCurrency, 
    setInputCurrency, 
    editingEntryId, 
    setEditingEntryId, 
    editAmount, 
    setEditAmount, 
    editCurrency, 
    setEditCurrency, 
    editDocId, 
    setEditDocId, 
    localSymbol, 
    isDomesticTrip, 
    displayCurrency, 
    toggleCurrency, 
    totalActiveSpend, 
    prePaidSpend, 
    grandTotal, 
    timelineItems, 
    categoryBreakdown, 
    formatCost, 
    handleSaveActual, 
    handleAddMisc, 
    removeMiscExpense, 
    syncLedger,
    exchangeRate 
  } = ledger;

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12">
      <Link href={`/itinerary/${trip.id}`} className="text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white mb-12 inline-block transition-colors">
        ← Back to Dispatch
      </Link>

      <header className="border-b-2 border-slate-900 dark:border-white pb-8 mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-serif tracking-tight uppercase text-slate-900 dark:text-white leading-none">The Treasury</h1>
            <p className="font-mono text-[10px] tracking-widest uppercase mt-4 text-slate-500">Financial Dispatch • {trip.destination}</p>
          </div>
          {!isDomesticTrip && (
            <button onClick={toggleCurrency} className="text-[10px] font-mono uppercase tracking-widest text-slate-900 dark:text-white border border-slate-900 dark:border-white px-5 py-2.5 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors">
              Viewing {displayCurrency}
            </button>
          )}
        </div>
      </header>

      {/* Top Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
        <div className="border-l border-slate-300 dark:border-slate-800 pl-6">
          <h3 className="font-mono text-[10px] tracking-widest uppercase text-slate-500 mb-4">Total Exposure</h3>
          <p className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white">{formatCost(grandTotal)}</p>
        </div>
        <div className="border-l border-slate-300 dark:border-slate-800 pl-6">
          <h3 className="font-mono text-[10px] tracking-widest uppercase text-slate-500 mb-4">Daily Fund</h3>
          <p className={`text-4xl md:text-5xl font-serif ${totalActiveSpend > trip.budgetGBP ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{formatCost(totalActiveSpend)}</p>
          <p className="text-xs font-serif italic text-slate-500 mt-2">of {formatCost(trip.budgetGBP)} limit</p>
        </div>
        <div className="border-l border-slate-300 dark:border-slate-800 pl-6">
          <h3 className="font-mono text-[10px] tracking-widest uppercase text-slate-500 mb-4">Advance Assets</h3>
          <p className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white">{formatCost(prePaidSpend)}</p>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-20">
        <h3 className="font-mono text-[10px] tracking-widest uppercase text-slate-900 dark:text-white border-b border-slate-900 dark:border-white pb-2 mb-6">Capital Allocation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-6">
          {Object.entries(categoryBreakdown)
            .filter(([_, amount]) => amount > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => (
              <div key={cat} className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-serif text-xl text-slate-700 dark:text-slate-300">{cat}</span>
                <span className="font-mono text-sm text-slate-900 dark:text-white">{formatCost(amount)}</span>
              </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-300 dark:border-slate-800 mb-12">
        <button onClick={() => setActiveTab('timeline')} className={`pb-3 font-mono text-[10px] tracking-widest uppercase transition-colors relative ${activeTab === 'timeline' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
          Timeline Ledger
          {activeTab === 'timeline' && <span className="absolute bottom-0 left-0 w-full h-px bg-slate-900 dark:bg-white" />}
        </button>
        <button onClick={() => setActiveTab('misc')} className={`pb-3 font-mono text-[10px] tracking-widest uppercase transition-colors relative ${activeTab === 'misc' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
          Advance & Misc
          {activeTab === 'misc' && <span className="absolute bottom-0 left-0 w-full h-px bg-slate-900 dark:bg-white" />}
        </button>
      </div>

      {/* Content */}
      <div className="pb-12">
        {activeTab === 'timeline' && (
          <div className="flex flex-col">
            {timelineItems.map(item => (
              <div key={item.id} className="py-8 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-baseline justify-between gap-6 group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">Day {item.dayNumber}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-2 py-0.5">{item.derivedCategory}</span>
                    {item.linkedDocumentId && <span className="text-xs" title="Receipt Attached">📎</span>}
                  </div>
                  <p className="font-serif text-3xl text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{item.locationName}</p>
                </div>

                {editingEntryId !== item.id ? (
                  <button onClick={() => { setEditingEntryId(item.id); setEditCurrency(isDomesticTrip ? 'GBP' : 'LOCAL'); setEditAmount(isDomesticTrip ? item.appliedCost.toFixed(2) : (item.appliedCost * exchangeRate).toFixed(2)); setEditDocId(item.linkedDocumentId || ''); }} className="text-left md:text-right cursor-pointer mt-4 md:mt-0">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 block mb-1">
                      {item.actualCostGBP !== undefined ? 'Actual' : 'Est.'}
                    </span>
                    <span className={`font-serif text-4xl ${item.actualCostGBP !== undefined ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {formatCost(item.appliedCost)}
                    </span>
                  </button>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border border-slate-200 dark:border-slate-800 w-full md:w-auto min-w-[320px] mt-4 md:mt-0">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-6 text-slate-500">Log Actual Expense</p>
                    
                    <div className="flex gap-4 items-end mb-8">
                      <div className="flex-1 border-b border-slate-900 dark:border-white flex items-baseline pb-2">
                        {!isDomesticTrip && (
                          <button onClick={() => setEditCurrency(editCurrency === 'LOCAL' ? 'GBP' : 'LOCAL')} className="font-serif text-2xl mr-3 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            {editCurrency === 'LOCAL' ? localSymbol : '£'}
                          </button>
                        )}
                        {isDomesticTrip && <span className="font-serif text-2xl mr-3 text-slate-500">£</span>}
                        <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-transparent font-serif text-4xl text-slate-900 dark:text-white outline-none w-full" autoFocus />
                      </div>
                    </div>

                    <div className="mb-8">
                       <select value={editDocId} onChange={(e) => setEditDocId(e.target.value)} className="w-full bg-transparent border-b border-slate-300 dark:border-slate-700 pb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500 outline-none">
                         <option value="">No Receipt Attached</option>
                         {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                       </select>
                    </div>

                    <div className="flex gap-4">
                      <button onClick={() => handleSaveActual(item.dayNumber, item.id)} className="font-mono text-[10px] uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-8 py-3 hover:bg-brand-600 dark:hover:bg-brand-400 transition-colors">Save</button>
                      <button onClick={() => setEditingEntryId(null)} className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white px-4 py-3 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'misc' && (
          <div className="flex flex-col gap-8">
            {!isAdding ? (
              <button onClick={() => setIsAdding(true)} className="w-full py-12 border border-slate-300 dark:border-slate-800 text-center font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:border-slate-900 hover:text-slate-900 dark:hover:border-white dark:hover:text-white transition-colors">
                + Log Advance / Misc Expense
              </button>
            ) : (
              <form onSubmit={handleAddMisc} className="border border-slate-900 dark:border-white p-8 md:p-12">
                <h4 className="font-serif text-3xl mb-12 text-slate-900 dark:text-white">Record New Asset</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 block mb-3">Description</label>
                    <input required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-transparent font-serif text-2xl outline-none placeholder:italic placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white" placeholder="British Airways" />
                  </div>
                  
                  <div className="border-b border-slate-300 dark:border-slate-700 pb-2 flex items-end">
                    <div className="flex-1">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 block mb-3">Amount</label>
                      <div className="flex items-baseline">
                        {!isDomesticTrip && (
                          <button type="button" onClick={() => setInputCurrency(inputCurrency === 'LOCAL' ? 'GBP' : 'LOCAL')} className="font-serif text-xl mr-3 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            {inputCurrency === 'LOCAL' ? localSymbol : '£'}
                          </button>
                        )}
                        {isDomesticTrip && <span className="font-serif text-xl mr-3 text-slate-500">£</span>}
                        <input type="number" step="0.01" required value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full bg-transparent font-serif text-2xl outline-none text-slate-900 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 block mb-3">Category</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as any)} className="w-full bg-transparent font-serif text-xl outline-none text-slate-900 dark:text-white cursor-pointer">
                      <option value="Transit">Transit</option><option value="Dining">Dining</option><option value="Activities">Activities</option><option value="Accommodation">Accommodation</option><option value="Shopping">Shopping</option><option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 block mb-3">Attach Receipt</label>
                    <select value={newDocId} onChange={(e) => setNewDocId(e.target.value)} className="w-full bg-transparent font-serif text-xl outline-none text-slate-900 dark:text-white cursor-pointer">
                      <option value="">No Receipt</option>
                      {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-12">
                  <input type="checkbox" id="prePaidToggle" checked={newIsPrePaid} onChange={(e) => setNewIsPrePaid(e.target.checked)} className="w-4 h-4 cursor-pointer accent-slate-900" />
                  <label htmlFor="prePaidToggle" className="font-serif text-lg text-slate-900 dark:text-white cursor-pointer">Mark as Pre-paid / Advance Expense</label>
                </div>

                <div className="flex justify-end gap-6 pt-8 border-t border-slate-300 dark:border-slate-700">
                  <button type="button" onClick={() => setIsAdding(false)} className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4">Cancel</button>
                  <button type="submit" className="font-mono text-[10px] uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-8 py-4 hover:bg-brand-600 dark:hover:bg-brand-400 transition-colors">Commit Record</button>
                </div>
              </form>
            )}

            <div className="flex flex-col mt-8">
              {(activeItinerary.miscExpenses || []).length === 0 ? (
                <div className="py-20 text-center border-t border-slate-200 dark:border-slate-800">
                  <p className="font-serif text-2xl text-slate-400 italic">No manual records found.</p>
                </div>
              ) : (
                (activeItinerary.miscExpenses || []).map((exp: MiscExpense) => (
                  <div key={exp.id} className="py-8 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-baseline justify-between gap-6 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">{exp.category}</span>
                        {exp.isSunkCost && <span className="font-mono text-[9px] uppercase tracking-widest text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-2 py-0.5">Pre-paid</span>}
                        {exp.linkedDocumentId && <span className="text-xs" title="Receipt attached">📎</span>}
                      </div>
                      <p className="font-serif text-3xl text-slate-900 dark:text-white">{exp.title}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-8 mt-4 md:mt-0">
                      <span className="font-serif text-4xl text-slate-900 dark:text-white">{formatCost(exp.amountGBP)}</span>
                      <button onClick={() => { removeMiscExpense(exp.id); syncLedger(); }} className="text-[10px] font-mono uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors">Void</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}