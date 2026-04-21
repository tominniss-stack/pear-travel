'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { LedgerState } from './LedgerClient';
import type { MiscExpense, ExpenseCategory } from '@/types';

const MONO_FILLS: Record<ExpenseCategory, string> = {
  Accommodation: 'bg-black/90 dark:bg-white/90',
  Transit:       'bg-black/70 dark:bg-white/70',
  Dining:        'bg-black/50 dark:bg-white/50',
  Activities:    'bg-black/35 dark:bg-white/35',
  Shopping:      'bg-black/20 dark:bg-white/20',
  Other:         'bg-black/10 dark:bg-white/10',
};

export default function LedgerEditorial({ ledger }: { ledger: LedgerState }) {
  const {
    trip, activeItinerary, activeTab, setActiveTab, documents,
    isAdding, setIsAdding, newTitle, setNewTitle, newAmount, setNewAmount,
    newCategory, setNewCategory, newIsPrePaid, setNewIsPrePaid, newDocId, setNewDocId,
    inputCurrency, setInputCurrency, editingEntryId, setEditingEntryId,
    editAmount, setEditAmount, editCurrency, setEditCurrency, editDocId, setEditDocId,
    localSymbol, isDomesticTrip, displayCurrency, toggleCurrency,
    totalActiveSpend, prePaidSpend, grandTotal, timelineItems, categoryBreakdown,
    formatCost, handleSaveActual, handleAddMisc, removeMiscExpense, syncLedger, exchangeRate,
  } = ledger;

  const sortedCategories = useMemo(
    () => Object.entries(categoryBreakdown).filter(([, a]) => a > 0).sort((a, b) => b[1] - a[1]),
    [categoryBreakdown],
  );

  const budgetPct = trip.budgetGBP > 0 ? Math.min((totalActiveSpend / trip.budgetGBP) * 100, 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 pt-14 pb-24 selection:bg-black/10 dark:selection:bg-white/10">

      <Link href={`/itinerary/${trip.id}`} className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 dark:text-white/60 font-medium hover:text-black dark:hover:text-white transition-colors inline-flex items-center gap-2 mb-16 group">
        <span className="inline-block transition-transform group-hover:-translate-x-0.5">&#8592;</span>
        Back to Dispatch
      </Link>

      {/* ── MASTHEAD ── */}
      <header className="mb-16 md:mb-20 lg:mb-24 text-center border-b border-black dark:border-white pb-12">
        <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-black/50 dark:text-white/50 mb-8 flex justify-center items-center gap-4">
          <span>Vol. I</span>
          <span className="w-1 h-1 rounded-full bg-black/30 dark:bg-white/30" />
          <span>Financial Dispatch</span>
          <span className="w-1 h-1 rounded-full bg-black/30 dark:bg-white/30" />
          <span>{trip.destination}</span>
        </p>
        <h1 className="font-serif text-[clamp(3.5rem,10vw,9rem)] tracking-tighter text-black dark:text-white uppercase mx-auto leading-[0.85] mb-8">
          The Ledger
        </h1>
        {!isDomesticTrip && (
          <button onClick={toggleCurrency} className="font-mono text-[9px] uppercase tracking-[0.4em] text-black dark:text-white border border-black/20 dark:border-white/20 px-8 py-3 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors rounded-full">
            Valuation · {displayCurrency}
          </button>
        )}
      </header>

      {/* ── TOP METRICS ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 border-b border-black dark:border-white mb-16 md:mb-20 lg:mb-24">
        <div className="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-black/20 dark:border-white/20 py-12 lg:pr-12 overflow-hidden break-words">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-black/60 dark:text-white/60 font-medium mb-6">Total Exposure</p>
          <p className="font-serif text-[clamp(4rem,8vw,8rem)] text-black dark:text-white tracking-tighter leading-none">{formatCost(grandTotal)}</p>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-black/50 dark:text-white/50 font-medium mt-6">Includes {formatCost(prePaidSpend)} advance capital</p>
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex-1 border-b border-black/20 dark:border-white/20 py-10 lg:px-10">
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-black/60 dark:text-white/60 font-medium mb-4">Daily Operating Fund</p>
            <p className={`font-serif text-6xl tracking-tight leading-none ${totalActiveSpend > trip.budgetGBP ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>{formatCost(totalActiveSpend)}</p>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-black/10 dark:bg-white/10 relative">
                <div className={`absolute top-0 left-0 h-[1px] transition-all duration-700 ${totalActiveSpend > trip.budgetGBP ? 'bg-red-600 dark:bg-red-400' : 'bg-black dark:bg-white'}`} style={{ width: `${budgetPct}%` }} />
              </div>
              <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-black/50 dark:text-white/50 font-medium">of {formatCost(trip.budgetGBP)}</p>
            </div>
          </div>
          <div className="flex-1 py-10 lg:px-10">
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-black/50 dark:text-white/50 mb-4">Sunk / Advance Assets</p>
            <p className="font-serif text-5xl tracking-tight leading-none text-black dark:text-white">{formatCost(prePaidSpend)}</p>
          </div>
        </div>
      </section>

      {/* ── CAPITAL ALLOCATION ── */}
      <section className="mb-16">
        <div className="flex items-baseline justify-between border-b border-black dark:border-white pb-2 mb-8">
          <h2 className="font-mono text-[10px] tracking-[0.25em] uppercase text-black dark:text-white">Capital Allocation</h2>
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-black/50 dark:text-white/50">{sortedCategories.length} categories</span>
        </div>
        {grandTotal > 0 && (
          <div className="flex h-2 w-full mb-10 overflow-hidden">
            {sortedCategories.map(([cat, amount]) => (
              <div key={cat} className={`h-full ${MONO_FILLS[cat as ExpenseCategory]} first:rounded-l-sm last:rounded-r-sm`} style={{ width: `${(amount / grandTotal) * 100}%` }} title={`${cat}: ${formatCost(amount)}`} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-20">
          {sortedCategories.map(([cat, amount], i) => {
            const pct = grandTotal > 0 ? ((amount / grandTotal) * 100).toFixed(1) : '0.0';
            return (
              <div key={cat} className="flex items-baseline justify-between border-b border-black/20 dark:border-white/20 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.15em] text-black/50 dark:text-white/50 w-5 text-right tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-serif text-lg text-black/80 dark:text-white/80">{cat}</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[10px] tracking-[0.15em] text-black/50 dark:text-white/50">{pct}%</span>
                  <span className="font-mono text-sm text-black dark:text-white tabular-nums">{formatCost(amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── EXCHANGE RATE FOOTNOTE ── */}
      {!isDomesticTrip && (
        <aside className="mb-20 border-l-2 border-black/20 dark:border-white/20 pl-6">
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-black/50 dark:text-white/50 leading-relaxed">
            Conversions estimated at <span className="text-black/60 dark:text-white/60">&pound;1 = {localSymbol}{exchangeRate.toFixed(2)}</span>
          </p>
        </aside>
      )}

      {/* ── TAB NAVIGATION ── */}
      <nav className="flex gap-10 border-b border-black/20 dark:border-white/20 mb-14">
        {(['timeline', 'misc'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`relative pb-4 font-mono text-[10px] tracking-[0.25em] uppercase transition-colors ${activeTab === tab ? 'text-black dark:text-white' : 'text-black/50 dark:text-white/50 hover:text-black/60 dark:hover:text-white/60'}`}>
            {tab === 'timeline' ? 'Timeline Ledger' : 'Advance & Misc'}
            {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black dark:bg-white" />}
          </button>
        ))}
      </nav>

      {/* ── TIMELINE TAB ── */}
      {activeTab === 'timeline' && (
        <section>
          {timelineItems.map((item) => (
            <article key={item.id} className="group border-b border-black/20 dark:border-white/20 last:border-b-0">
              <div className="py-10">
                {editingEntryId !== item.id ? (
                  <div className="flex items-end justify-between w-full gap-4 group-hover:px-2 transition-all">
                    <div className="flex-shrink-0 mb-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-black/60 dark:text-white/60 font-medium tabular-nums">Day {item.dayNumber}</span>
                        <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20" />
                        <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-black/60 dark:text-white/60 font-medium">{item.derivedCategory}</span>
                      </div>
                      <h3 className="font-serif text-2xl md:text-3xl text-black dark:text-white leading-none group-hover:italic transition-all">{item.locationName}</h3>
                    </div>
                    
                    {/* Dot Leader with Mobile Guard */}
                    <div className="dot-leader hidden sm:block flex-grow min-w-[40px] h-2 mb-2 md:mb-3 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    
                    <button onClick={() => { setEditingEntryId(item.id); setEditCurrency(isDomesticTrip ? 'GBP' : 'LOCAL'); setEditAmount(isDomesticTrip ? item.appliedCost.toFixed(2) : (item.appliedCost * exchangeRate).toFixed(2)); setEditDocId(item.linkedDocumentId || ''); }} className="flex-shrink-0 text-right cursor-pointer hover:scale-105 transition-transform origin-right">
                      <span className={`font-serif text-3xl md:text-4xl tabular-nums tracking-tight ${item.actualCostGBP !== undefined ? 'text-black dark:text-white' : 'text-black/30 dark:text-white/30'}`}>{formatCost(item.appliedCost)}</span>
                      <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-black/50 dark:text-white/50 font-medium block mt-1">{item.actualCostGBP !== undefined ? 'Actual' : 'Est.'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full md:w-auto md:min-w-[360px] mt-4 md:mt-0 border-t border-black/10 dark:border-white/10 pt-8">
                    <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-black/60 dark:text-white/60 font-medium mb-6">Log Actual Expense</p>
                    <div className="border-b border-black dark:border-white flex items-baseline pb-3 mb-8">
                      {!isDomesticTrip && (
                        <button onClick={() => setEditCurrency(editCurrency === 'LOCAL' ? 'GBP' : 'LOCAL')} className="font-serif text-3xl mr-3 text-black/60 dark:text-white/60 font-medium hover:text-black dark:hover:text-white transition-colors">
                          {editCurrency === 'LOCAL' ? localSymbol : '\u00A3'}
                        </button>
                      )}
                      {isDomesticTrip && <span className="font-serif text-3xl mr-3 text-black/60 dark:text-white/60 font-medium">&pound;</span>}
                      <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-transparent font-serif text-4xl text-black dark:text-white outline-none w-full tabular-nums placeholder:text-black/20 dark:placeholder:text-white/20" placeholder="0.00" autoFocus />
                    </div>
                    <div className="border-b border-black/20 dark:border-white/20 pb-3 mb-8">
                      <select value={editDocId} onChange={(e) => setEditDocId(e.target.value)} className="w-full bg-transparent font-mono text-[10px] tracking-[0.2em] uppercase text-black/50 dark:text-white/50 outline-none cursor-pointer">
                        <option value="">No Receipt Attached</option>
                        {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => handleSaveActual(item.dayNumber, item.id)} className="font-mono text-[10px] tracking-[0.2em] uppercase bg-black text-white dark:bg-white dark:text-black px-8 py-3 hover:bg-black/80 dark:hover:bg-white/80 transition-colors">Save</button>
                      <button onClick={() => setEditingEntryId(null)} className="font-mono text-[10px] tracking-[0.2em] uppercase text-black/60 dark:text-white/60 font-medium hover:text-black dark:hover:text-white px-4 py-3 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
          {timelineItems.length === 0 && (
            <div className="py-24 text-center">
              <p className="font-serif text-2xl italic text-black/20 dark:text-white/20">No timeline entries recorded.</p>
            </div>
          )}
        </section>
      )}

      {/* ── MISC / ADVANCE TAB ── */}
      {activeTab === 'misc' && (
        <section>
          {!isAdding ? (
            <button onClick={() => setIsAdding(true)} className="w-full py-14 border border-black/20 dark:border-white/20 text-center font-mono text-[10px] tracking-[0.25em] uppercase text-black/50 dark:text-white/50 hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white transition-colors mb-12">
              + Log Advance / Misc Expense
            </button>
          ) : (
            <form onSubmit={handleAddMisc} className="border border-black dark:border-white p-8 md:p-14 mb-12">
              <h4 className="font-serif text-3xl md:text-4xl text-black dark:text-white mb-14 leading-tight">Record New Asset</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10 mb-14">
                <div>
                  <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-black/60 dark:text-white/60 font-medium block mb-3">Description</label>
                  <div className="border-b border-black/20 dark:border-white/20 pb-2 focus-within:border-black dark:focus-within:border-white transition-colors">
                    <input required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-transparent font-serif text-xl text-black dark:text-white outline-none placeholder:italic placeholder:text-black/20 dark:placeholder:text-white/20" placeholder="British Airways" />
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-black/60 dark:text-white/60 font-medium block mb-3">Amount</label>
                  <div className="border-b border-black/20 dark:border-white/20 pb-2 flex items-baseline focus-within:border-black dark:focus-within:border-white transition-colors">
                    {!isDomesticTrip && (
                      <button type="button" onClick={() => setInputCurrency(inputCurrency === 'LOCAL' ? 'GBP' : 'LOCAL')} className="font-serif text-xl mr-3 text-black/60 dark:text-white/60 font-medium hover:text-black dark:hover:text-white transition-colors">
                        {inputCurrency === 'LOCAL' ? localSymbol : '\u00A3'}
                      </button>
                    )}
                    {isDomesticTrip && <span className="font-serif text-xl mr-3 text-black/60 dark:text-white/60 font-medium">&pound;</span>}
                    <input type="number" step="0.01" required value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full bg-transparent font-serif text-xl text-black dark:text-white outline-none tabular-nums placeholder:text-black/20 dark:placeholder:text-white/20" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-black/60 dark:text-white/60 font-medium block mb-3">Category</label>
                  <div className="border-b border-black/20 dark:border-white/20 pb-2 focus-within:border-black dark:focus-within:border-white transition-colors">
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)} className="w-full bg-transparent font-serif text-xl text-black dark:text-white outline-none cursor-pointer appearance-none">
                      <option value="Transit">Transit</option>
                      <option value="Dining">Dining</option>
                      <option value="Activities">Activities</option>
                      <option value="Accommodation">Accommodation</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-black/60 dark:text-white/60 font-medium block mb-3">Attach Receipt</label>
                  <div className="border-b border-black/20 dark:border-white/20 pb-2 focus-within:border-black dark:focus-within:border-white transition-colors">
                    <select value={newDocId} onChange={(e) => setNewDocId(e.target.value)} className="w-full bg-transparent font-serif text-xl text-black dark:text-white outline-none cursor-pointer appearance-none">
                      <option value="">No Receipt</option>
                      {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-14 py-6 border-t border-b border-black/20 dark:border-white/20">
                <input type="checkbox" id="prePaidToggle" checked={newIsPrePaid} onChange={(e) => setNewIsPrePaid(e.target.checked)} className="w-4 h-4 cursor-pointer accent-black dark:accent-white" />
                <label htmlFor="prePaidToggle" className="cursor-pointer">
                  <span className="font-serif text-lg text-black dark:text-white block leading-tight">Mark as Pre-paid / Advance Expense</span>
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-black/30 dark:text-white/30 mt-1 block">Adds to grand total without affecting daily fund</span>
                </label>
              </div>
              <div className="flex justify-end gap-6">
                <button type="button" onClick={() => setIsAdding(false)} className="font-mono text-[10px] tracking-[0.2em] uppercase text-black/60 dark:text-white/60 font-medium hover:text-black dark:hover:text-white px-4 py-3 transition-colors">Cancel</button>
                <button type="submit" className="font-mono text-[10px] tracking-[0.2em] uppercase bg-black text-white dark:bg-white dark:text-black px-10 py-4 hover:bg-black/80 dark:hover:bg-white/80 transition-colors">Commit Record</button>
              </div>
            </form>
          )}

          {(activeItinerary.miscExpenses || []).length === 0 ? (
            <div className="py-24 text-center border-t border-black/20 dark:border-white/20">
              <p className="font-serif text-2xl italic text-black/20 dark:text-white/20">No manual records found.</p>
            </div>
          ) : (
            <div>
              <div className="hidden md:grid md:grid-cols-[1fr_auto_auto] gap-8 items-baseline border-b border-black dark:border-white pb-2 mb-0">
                <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-black/50 dark:text-white/50">Description</span>
                <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-black/50 dark:text-white/50 text-right">Amount</span>
                <span className="w-16" />
              </div>
              {(activeItinerary.miscExpenses || []).map((exp: MiscExpense) => (
                <article key={exp.id} className="group border-b border-black/20 dark:border-white/20 last:border-b-0">
                  <div className="py-8 flex flex-col md:grid md:grid-cols-[1fr_auto_auto] md:items-baseline gap-4 md:gap-8">
                    <div className="min-w-0">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-black/50 dark:text-white/50">{exp.category}</span>
                        {exp.isSunkCost && <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-black/50 dark:text-white/50">Pre-paid</span>}
                        {exp.linkedDocumentId && <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-black/50 dark:text-white/50" title="Receipt attached">Receipt &#10003;</span>}
                      </div>
                      <h3 className="font-serif text-2xl text-black dark:text-white leading-tight">{exp.title}</h3>
                    </div>
                    <span className="font-serif text-3xl text-black dark:text-white tabular-nums text-right">{formatCost(exp.amountGBP)}</span>
                    <div className="flex justify-end w-16">
                      <button onClick={() => { removeMiscExpense(exp.id); syncLedger(); }} className="font-mono text-[9px] tracking-[0.2em] uppercase text-black/20 dark:text-white/20 hover:text-red-600 dark:hover:text-red-400 transition-colors py-1">Void</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
