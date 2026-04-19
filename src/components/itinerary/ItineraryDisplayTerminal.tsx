'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Itinerary } from '@/types';
import type { ThemeProps } from '@/types/theme';
import { useTripStore } from '@/store/tripStore';

export default function ItineraryDisplayTerminal({
  trip,
  itinerary,
  briefing,
  totalCostBase,
  baseCurrencyCode,
  basecamps,
  onOpenLedger,
  onOpenDocs,
  onOpenCalendar,
  onEditTrip
}: ThemeProps) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const phrases = essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 ? essentials.usefulPhrases : [];
  
  const { displayCurrency, exchangeRate, toggleCurrency } = useTripStore();
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [isBooted, setIsBooted] = useState(false);
  const [colorTheme, setColorTheme] = useState<'emerald' | 'red' | 'white'>('emerald');
  
  const localCurrencyRaw = essentials?.currency || '';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localCurrencyRaw.includes(baseCurrencyCode);

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return 'N/A';
    if (cost === 0) return '0.00';
    if (displayCurrency === 'LOCAL' && !isDomesticTrip) return `${localSymbol}${(cost * exchangeRate).toFixed(2)}`;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: baseCurrencyCode }).format(cost);
  };

  useEffect(() => {
    const logs = [
      `> peartravel-cli v3.1.4`,
      `> Connecting to remote server... [OK]`,
      `> Fetching trip data: ${trip.id}... [OK]`,
      `> Parsing itinerary payload... [OK]`,
      `> Initialization complete.`
    ];
    
    let current = 0;
    setBootLog([]); 
    setIsBooted(false);

    const interval = setInterval(() => {
      if (current < logs.length) {
        setBootLog(prev => {
          if (prev.includes(logs[current])) return prev;
          return [...prev, logs[current]];
        });
        current++;
      } else {
        setIsBooted(true);
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [trip.id]);

  const themeClasses = {
    emerald: { 
      text: 'text-emerald-500', textBright: 'text-emerald-400', hoverTextBright: 'hover:text-emerald-400',
      border: 'border-emerald-500', bgHover: 'hover:bg-emerald-950/30', accent: 'text-emerald-700', 
      dim: 'border-emerald-900', selection: 'selection:bg-emerald-900 selection:text-emerald-100', hex: '#10b981'
    },
    red: { 
      text: 'text-red-500', textBright: 'text-red-400', hoverTextBright: 'hover:text-red-400',
      border: 'border-red-500', bgHover: 'hover:bg-red-950/30', accent: 'text-red-700', 
      dim: 'border-red-900', selection: 'selection:bg-red-900 selection:text-red-100', hex: '#ef4444'
    },
    white: { 
      text: 'text-slate-300', textBright: 'text-white', hoverTextBright: 'hover:text-white',
      border: 'border-slate-300', bgHover: 'hover:bg-slate-800/30', accent: 'text-slate-500', 
      dim: 'border-slate-800', selection: 'selection:bg-slate-700 selection:text-white', hex: '#cbd5e1'
    }
  };

  const c = themeClasses[colorTheme];

  return (
    <div className={`w-full min-h-screen bg-black print:bg-white ${c.text} print:text-black font-mono p-4 md:p-8 ${c.selection} overflow-x-hidden transition-colors duration-300`}>
      
      {/* FORCE GLOBAL BLACKOUT & HIDE THEME TOGGLE */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html { background-color: #000 !important; color: ${c.hex} !important; }
        header, nav, footer { background-color: #000 !important; border-color: #111 !important; color: ${c.hex} !important; }
        #theme-toggle-button { display: none !important; }
        @media print {
          body, html { background-color: #fff !important; color: #000 !important; }
          header, nav, footer { display: none !important; }
        }
      `}} />

      <div className="max-w-4xl mx-auto">
        
        {/* TOP CONTROLS */}
        {isBooted && (
          <div className="flex flex-wrap justify-between items-center mb-8 border-b border-dashed print:hidden pb-4 gap-4">
            <div className="flex gap-3 text-xs tracking-widest">
              <span className="opacity-50">COLOR:</span>
              <button onClick={() => setColorTheme('emerald')} className={`${c.hoverTextBright} ${colorTheme === 'emerald' ? c.textBright : c.accent}`}>[GRN]</button>
              <button onClick={() => setColorTheme('red')} className={`${c.hoverTextBright} ${colorTheme === 'red' ? c.textBright : c.accent}`}>[RED]</button>
              <button onClick={() => setColorTheme('white')} className={`${c.hoverTextBright} ${colorTheme === 'white' ? c.textBright : c.accent}`}>[WHT]</button>
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs tracking-widest">
              <Link href="/dashboard" className={`${c.hoverTextBright}`}>[EXIT]</Link>
              <button onClick={onOpenLedger} className={c.hoverTextBright}>[LEDGER]</button>
              <button onClick={onOpenDocs} className={c.hoverTextBright}>[DOCS]</button>
              <button onClick={onOpenCalendar} className={c.hoverTextBright}>[EXPORT]</button>
              <button onClick={onEditTrip} className={c.hoverTextBright}>[EDIT]</button>
              <button onClick={toggleCurrency} className={c.hoverTextBright}>[CURRENCY:{displayCurrency}] ⟲</button>
              <button onClick={() => window.print()} className={`${c.hoverTextBright}`}>[PRINT]</button>
            </div>
          </div>
        )}

        {/* BOOT SEQUENCE */}
        <div className="mb-8 opacity-70 text-xs md:text-sm print:hidden">
          {bootLog.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          {!isBooted && <div className="animate-pulse mt-1">_</div>}
        </div>

        {(isBooted || typeof window === 'undefined') && (
          <div className="animate-in fade-in duration-1000 print:animate-none print:opacity-100">
            
            {/* HEADER */}
            <header className={`border-2 ${c.border} print:border-black p-4 md:p-6 mb-12 relative`}>
              <div className="absolute -top-3 left-4 bg-black print:bg-white px-2 text-xs font-bold tracking-widest">
                // TRIP_METADATA
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2 break-words print:text-black">
                {trip.destination}
              </h1>
              <div className={`flex flex-col md:flex-row gap-4 md:gap-8 text-xs md:text-sm opacity-80 mt-4 border-t ${c.dim} print:border-black pt-4`}>
                <div><span className={`${c.accent} print:text-slate-500`}>DURATION:</span> {trip.duration} DAYS</div>
                <div><span className={`${c.accent} print:text-slate-500`}>BUDGET_LIMIT_{baseCurrencyCode}:</span> {formatCost(trip.budgetGBP)}</div>
                <div><span className={`${c.accent} print:text-slate-500`}>EST_TOTAL_{baseCurrencyCode}:</span> {formatCost(totalCostBase)}</div>
                <div className="flex items-center">
                  <span className={`${c.accent} print:text-slate-500 mr-2`}>STATUS:</span> 
                  <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse print:animate-none print:bg-black mr-1" />
                  ONLINE
                </div>
              </div>
            </header>

            {/* SYS_DIAGNOSTICS */}
            <section className="mb-8">
              <div className={`text-xs uppercase tracking-widest mb-3 border-b ${c.dim} print:border-black pb-1`}>
                :: SYS_DIAGNOSTICS
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {briefing?.tapWaterStatus && briefing.tapWaterStatus !== 'UNKNOWN' && (
                  <div><span className={c.accent}>[ WATER_SYS ]</span> STATUS: {briefing?.tapWaterStatus}</div>
                )}
                {briefing?.languageBarrier && briefing.languageBarrier !== 'UNKNOWN' && (
                  <div><span className={c.accent}>[ LANG_BARRIER ]</span> LEVEL: {briefing?.languageBarrier}</div>
                )}
                {briefing?.primaryTransit && (
                  <div><span className={c.accent}>[ PRIMARY_TRANSIT ]</span> MODE: {briefing?.primaryTransit}</div>
                )}
                {briefing?.tippingNorm && briefing.tippingNorm !== 'UNKNOWN' && (
                  <div><span className={c.accent}>[ ECON_PROTOCOL ]</span> TIPPING: {briefing?.tippingNorm}</div>
                )}
              </div>
            </section>

            {/* BASECAMP_MOUNTED */}
            {basecamps.length > 0 && (
              <section className="mb-8">
                <div className={`text-xs uppercase tracking-widest mb-3 border-b ${c.dim} print:border-black pb-1`}>
                  :: BASECAMP_MOUNTED
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {basecamps.map((camp, i) => (
                    <div key={i} className="flex justify-between border-b border-dashed border-white/10 print:border-black/20 pb-1">
                      <span className={`${c.accent} print:text-slate-500`}>DAY_{camp.startDay.toString().padStart(2, '0')}:</span>
                      <span>{camp.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TRANSIT_PROTOCOL */}
            {trip.intake?.transitDetails && (
              <section className="mb-12">
                <div className={`text-xs uppercase tracking-widest mb-3 border-b ${c.dim} print:border-black pb-1`}>
                  :: TRANSIT_PROTOCOL : {trip.intake.transitDetails.mode.toUpperCase()}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div className="flex justify-between border-b border-dashed border-white/10 print:border-black/20 pb-1">
                    <span className={`${c.accent} print:text-slate-500`}>OUTBOUND_{trip.intake.transitDetails.outbound?.time || 'TBD'}:</span>
                    <span>REF:{trip.intake.transitDetails.outbound?.reference || 'PENDING'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-white/10 print:border-black/20 pb-1">
                    <span className={`${c.accent} print:text-slate-500`}>RETURN_{trip.intake.transitDetails.return?.time || 'TBD'}:</span>
                    <span>REF:{trip.intake.transitDetails.return?.reference || 'PENDING'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* ESSENTIALS LOG */}
            {essentials && (
              <section className="mb-12">
                <div className={`text-xs uppercase tracking-widest mb-3 border-b ${c.dim} print:border-black pb-1`}>
                  :: ENVIRONMENT_VARS
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div className="flex justify-between border-b border-dashed border-white/10 print:border-black/20 pb-1">
                    <span className={`${c.accent} print:text-slate-500`}>CURRENCY:</span>
                    <span>{essentials.currency}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-white/10 print:border-black/20 pb-1">
                    <span className={`${c.accent} print:text-slate-500`}>PLUG_TYPE:</span>
                    <span>{essentials.plugType}</span>
                  </div>
                </div>
              </section>
            )}

            {/* LANGUAGE PACK */}
            {phrases.length > 0 && (
              <section className="mb-16">
                <div className={`text-xs uppercase tracking-widest mb-3 border-b ${c.dim} print:border-black pb-1`}>
                  :: LANGUAGE_PACK
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-sm">
                  {phrases.map((p, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:justify-between border-b border-dashed border-white/10 print:border-black/20 pb-1">
                      <span className={`${c.accent} print:text-slate-500`}>{p.phrase}</span>
                      <span className={`${c.textBright} print:text-black font-bold`}>{p.translation}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ITINERARY LOOP */}
            <section>
              <div className={`text-xs uppercase tracking-widest mb-6 border-b ${c.dim} print:border-black pb-1`}>
                :: SCHEDULE_ROUTINE
              </div>

              <div className="space-y-12">
                {days.map((day) => (
                  <div key={day.dayNumber} className="relative break-inside-avoid">
                    <div className="text-xl font-bold mb-4 flex items-center gap-4">
                      <span>[DAY_{day.dayNumber.toString().padStart(2, '0')}]</span>
                      <span className={`h-px ${c.dim} bg-current print:bg-black flex-1 opacity-50`} />
                    </div>

                    <div className="space-y-1 font-sm">
                      {day.entries.map((entry) => {
                        const tm = entry.transitMethod ? String(entry.transitMethod) : '';
                        const showTransit = tm && !tm.toLowerCase().includes('walk') && tm !== 'Start of Day';

                        return (
                          <div key={entry.id} className={`flex flex-col ${c.bgHover} p-2 -mx-2 transition-colors group print:border-b print:border-dashed print:border-black/20 print:p-4 print:mx-0`}>
                            <div className="flex flex-col md:flex-row w-full">
                              <div className={`w-24 ${c.accent} print:text-black shrink-0 font-bold`}>
                                {entry.time || 'XX:XX'}
                              </div>
                              <div className="flex-1">
                                <span className={`font-bold ${c.textBright} print:text-black mr-2`}>
                                  {entry.locationName}
                                </span>
                                <span className="opacity-70 text-xs hidden md:inline print:inline">
                                  {entry.activityDescription?.replace(/^\[.*?\]\s*/, '')}
                                </span>
                              </div>
                              
                              {/* Data Columns */}
                              <div className="w-full md:w-48 flex justify-between md:justify-end gap-4 shrink-0 mt-2 md:mt-0 text-xs items-center">
                                {showTransit && (
                                  <span className={`text-amber-500 print:text-black bg-amber-950/30 print:bg-transparent px-1 border border-amber-900/50 print:border-black`}>
                                    {tm.substring(0, 3).toUpperCase()}
                                  </span>
                                )}
                                <span className={`${c.text} print:text-black font-bold`}>
                                  {formatCost(entry.estimatedCostGBP)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Mobile description (wraps under) */}
                            <div className="w-full text-xs opacity-70 mt-1 md:hidden print:hidden pl-24">
                              {entry.activityDescription?.replace(/^\[.*?\]\s*/, '')}
                            </div>

                            {/* CLI Transit Note */}
                            {entry.transitNote && (
                              <div className="w-full text-xs mt-1 md:ml-24 opacity-50 print:opacity-70 print:ml-0">
                                <span className="text-amber-500 print:text-black">{">> "}</span>
                                <span className="uppercase tracking-widest">[ROUTING: {entry.transitNote}]</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* TERMINATE SESSION BUTTON */}
            <div className="mt-20 text-center print:hidden">
              <Link href="/dashboard" className={`inline-block border ${c.border} px-6 py-3 text-xs tracking-widest uppercase hover:bg-current hover:text-black transition-colors font-bold`}>
                [ TERMINATE_SESSION ]
              </Link>
            </div>

            {/* BLINKING EOF CURSOR */}
            <div className={`mt-8 text-xs opacity-50 border-t ${c.dim} print:border-black pt-4 pb-12 flex justify-between`}>
              <span>EOF // SCRIPT_TERMINATED</span>
              <span className="animate-pulse">█</span>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}