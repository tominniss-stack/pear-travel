'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import type { Itinerary, ItineraryEntry, DayItinerary } from '@/types';
import type { ThemeProps, ClientTripProps } from '@/types/theme';
import PlaceDetailsModal, { DocumentInfo } from './PlaceDetailsModal';
import DayMap from './DayMap';
import { useTripStore } from '@/store/tripStore';

function getGoogleMapsTravelMode(method?: string) {
  if (!method) return 'transit';
  const m = method.toLowerCase();
  if (m.includes('walk')) return 'walking';
  if (m.includes('cycl') || m.includes('bike')) return 'bicycling';
  if (m.includes('taxi') || m.includes('car') || m.includes('drive')) return 'driving';
  return 'transit';
}

function PrintOnlyBooklet({ trip, itinerary, formatCost, localCurrencyRaw, totalStops }: { trip: ClientTripProps; itinerary: Itinerary; formatCost: (c?: number) => string; localCurrencyRaw: string; totalStops: number; }) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const phrases = essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 ? essentials.usefulPhrases : [];
  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const tapWater = essentials?.tapWater || 'Safe to drink';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const [baseUrl, setBaseUrl] = useState('https://peartravel.app');
  
  useEffect(() => { if (typeof window !== 'undefined') setBaseUrl(window.location.origin); }, []);
  const masterQrUrl = `${baseUrl}/itinerary/${trip.id}`;

  return (
    <div className="hidden print:block w-full bg-white text-black font-sans print:m-0 print:p-0">
      <div className="print:page-break-after-always pb-8">
        <div className="mb-8 border-b-2 border-black pb-6 flex justify-between items-start">
          <div className="flex-1 pr-6">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">Your Travel Booklet</p>
            <h1 className="text-6xl font-serif mb-3 tracking-tight">{trip.destination}</h1>
            <p className="text-xl font-medium text-slate-700 flex items-center gap-2 font-mono uppercase tracking-widest text-xs">
              {trip.startDate && trip.endDate ? `${format(new Date(trip.startDate), 'do MMMM')} — ${format(new Date(trip.endDate), 'do MMMM yyyy')}` : `${trip.duration} Days`}
              <span>·</span> {totalStops} Stops <span>·</span> Est. Budget: {formatCost(trip.budgetGBP)}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border-2 border-slate-200 rounded-xl shrink-0 w-32 bg-white">
            <QRCode value={masterQrUrl} size={90} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 256 256`} level="M" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-12 mb-8">
          <div>
            <h3 className="text-xl font-serif border-b border-slate-300 pb-2 mb-4">Logistics</h3>
            <ul className="text-base space-y-3 font-sans">
              <li><strong className="text-slate-500 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Currency</strong> {localCurrencyRaw} ({localSymbol})</li>
              <li><strong className="text-slate-500 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Power Outlets</strong> {plugType}</li>
              <li><strong className="text-slate-500 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Tap Water</strong> {tapWater}</li>
            </ul>
          </div>
          <div>
            {phrases.length > 0 && (
              <>
                <h3 className="text-xl font-serif border-b border-slate-300 pb-2 mb-4">Survival Phrases</h3>
                <ul className="text-base space-y-3 font-sans">
                  {phrases.map((p: { phrase: string; translation: string }, i: number) => (
                    <li key={i} className="flex justify-between items-end border-b border-slate-100 pb-1">
                      <span className="text-slate-600">{p.phrase}</span>
                      <span className="font-bold text-black">{p.translation}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {days.map((day: DayItinerary) => (
        <div key={day.dayNumber} className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
            <h2 className="text-3xl font-serif text-black">Day {day.dayNumber}</h2>
          </div>
          <table className="w-full text-base font-sans">
            <tbody>
              {day.entries.map((entry: ItineraryEntry, idx: number) => (
                <tr key={idx} className="border-b border-slate-200" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <td className="w-[15%] py-5 align-top font-bold text-xl tabular-nums font-mono">{entry.time || '—'}</td>
                  <td className="w-[65%] py-5 pr-6 align-top">
                    <div className="font-serif text-xl text-black mb-1">{entry.locationName}</div>
                    <div className="text-slate-700 leading-relaxed text-sm">{entry.activityDescription?.replace(/^\[.*?\]\s*/, '')}</div>
                  </td>
                  <td className="w-[20%] py-5 align-top text-right font-bold whitespace-nowrap text-lg font-mono">{formatCost(entry.estimatedCostGBP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

const InkSplodge = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 120 80"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none mix-blend-multiply opacity-40 dark:opacity-20 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M55 10 C30 8, 8 22, 10 42 C12 58, 28 72, 50 70 C68 68, 88 60, 92 44 C97 26, 80 8, 55 10 Z"
      fill="#5c3d1e"
    />
    <path
      d="M60 18 C72 14, 84 24, 80 36 C76 46, 62 52, 52 48 C40 44, 36 32, 44 24 C48 20, 54 20, 60 18 Z"
      fill="#3b2008"
      opacity="0.5"
    />
    <path
      d="M30 38 C26 34, 22 40, 28 44 C32 46, 36 42, 30 38 Z"
      fill="#5c3d1e"
    />
    <path
      d="M85 50 C82 46, 78 52, 83 55 C87 57, 90 52, 85 50 Z"
      fill="#5c3d1e"
    />
  </svg>
);

function TimelineEntryNotebook({
  entry, nextEntry, isLast, isOdd, index, accommodationName, destination, onPlaceClick, formatCost
}: {
  entry: ItineraryEntry; nextEntry?: ItineraryEntry; isLast: boolean; isOdd: boolean; index: number; accommodationName?: string; destination: string; onPlaceClick: (placeId: string, poiId: string) => void; formatCost: (cost?: number) => string;
}) {
  const hasPlaceId = !!(entry.placeId && entry.placeId !== "null" && entry.placeId !== "");
  const isBookend = (entry.type === 'ACCOMMODATION' || entry.transitMethod === 'Start of Day') && !entry.isDining;
  
  let displayTitle = entry.locationName || 'Unknown Location';
  if (isBookend && accommodationName && /^(accommodation|hotel|airbnb|start of day)/i.test(displayTitle.trim())) {
    displayTitle = accommodationName;
  }

  const cardRotations = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[1.5deg]', '-rotate-[1.5deg]', 'rotate-[0.5deg]'];
  const cardRotation = cardRotations[index % cardRotations.length];

  const getMarginDoodle = () => {
    if (isBookend) return null;
    const isDining = entry.isDining || /lunch|dinner|breakfast|cafe|restaurant|eat/i.test(entry.activityDescription + ' ' + entry.locationName);
    
    if (isDining) {
      return <span className="font-handwriting text-xs text-slate-500 dark:text-slate-400 -rotate-6 inline-block mt-3 opacity-60">(dining)</span>;
    }
    
    const isTransit = entry.transitMethod && !entry.transitMethod.toLowerCase().includes('walk') && entry.transitMethod !== 'Start of Day';
    if (isTransit) {
      return <span className="font-handwriting text-xs text-slate-500 dark:text-slate-400 rotate-6 inline-block mt-3 opacity-60">travel →</span>;
    }
    
    return <span className="font-handwriting text-xs text-slate-500 dark:text-slate-400 -rotate-3 inline-block mt-3 opacity-60">explore</span>;
  };
  
  return (
    <div className="flex flex-col relative pb-10">
      {!isLast && <div className="absolute left-[24px] top-12 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-700 border-l-2 border-dotted border-slate-400 dark:border-slate-500" />}

      <div className="flex items-start gap-4 md:gap-8 relative z-10">
        <div className="w-12 md:w-16 pt-2 flex-shrink-0 flex flex-col items-center">
          <span className="font-typewriter text-red-600 dark:text-red-400 border-2 border-red-600/40 dark:border-red-400/40 rounded-sm shadow-sm px-1 md:px-1.5 py-1 -rotate-3 inline-block font-bold text-sm md:text-base mix-blend-multiply dark:mix-blend-screen bg-red-50/50 dark:bg-red-900/20 backdrop-blur-sm">
            {entry.time ? entry.time.replace(/^0/, '') : 'TBD'}
          </span>
          {getMarginDoodle()}
        </div>
        
        <div
          onClick={() => hasPlaceId && onPlaceClick(entry.placeId!, entry.id)}
          className={`flex-1 group ${hasPlaceId ? 'cursor-pointer' : 'cursor-default'} relative ${isOdd ? 'md:ml-12' : 'md:ml-0'} bg-[#fffcf5] dark:bg-stone-800 p-3 pb-8 shadow-[2px_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[2px_4px_12px_rgba(0,0,0,0.4)] border border-stone-200 dark:border-stone-700 ${cardRotation} transition-transform hover:rotate-0`}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-yellow-100/90 dark:bg-yellow-900/60 rotate-3 shadow-[1px_2px_4px_rgba(0,0,0,0.1)] mix-blend-multiply dark:mix-blend-screen" />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h4 className="text-3xl md:text-4xl font-handwriting leading-none text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors inline-block relative">
                  {displayTitle}
                </h4>
                <p className="text-base md:text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-serif italic max-w-2xl mt-3">{entry.activityDescription?.replace(/^\[.*?\]\s*/, '')}</p>
              </div>
              {!isBookend && <span className="flex-shrink-0 text-xl font-handwriting text-green-700 dark:text-emerald-400 -rotate-2 mt-1">{formatCost(entry.estimatedCostGBP)}</span>}
            </div>

            {!isLast && nextEntry && nextEntry.transitNote && (
               <div className="mt-6 w-max">
                 <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(displayTitle + ', ' + destination)}&destination=${encodeURIComponent(nextEntry.locationName + ', ' + destination)}&travelmode=${getGoogleMapsTravelMode(nextEntry.transitMethod)}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs md:text-sm font-typewriter uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all`}>
                   <span className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 px-2 py-0.5 rounded-sm shadow-[1px_1px_2px_rgba(0,0,0,0.3)] rotate-1">
                     {nextEntry.transitMethod.replace('Taxi / Rideshare', 'Taxi').toUpperCase()}
                   </span>
                   <span className="opacity-80 font-handwriting text-lg lowercase">» {nextEntry.transitNote}</span>
                 </a>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ItineraryDisplayNotebook({ trip, itinerary, briefing, totalCostGBP, basecamps, onOpenLedger, onOpenDocs, onOpenCalendar, onEditTrip }: ThemeProps) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);
  const [isDialOpen, setIsDialOpen] = useState(false);

  const { exchangeRate, setExchangeRate, displayCurrency, toggleCurrency, intake } = useTripStore();
  const accommodationName = intake?.accommodation || trip.intake?.accommodation;

  const localCurrencyRaw = essentials?.currency || '';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localSymbol === '£' || localCurrencyRaw.includes('GBP');
  const symbolSpacer = localSymbol.length > 1 ? ' ' : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currencyMatch = localCurrencyRaw.match(/[A-Z]{3}/);
    const targetCurrency = currencyMatch ? currencyMatch[0] : null;

    if (targetCurrency && targetCurrency !== 'GBP') {
      fetch(`https://api.frankfurter.app/latest?from=GBP&to=${targetCurrency}`)
        .then((res) => res.json())
        .then((data) => { if (data.rates && data.rates[targetCurrency]) setExchangeRate(data.rates[targetCurrency]); })
        .catch(() => {});
    } else if (targetCurrency === 'GBP') {
       setExchangeRate(1);
    }
  }, [localCurrencyRaw, setExchangeRate]);

  const [heroImage, setHeroImage] = useState<string>(`https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80`);
  useEffect(() => {
    if (!intake?.destinationPlaceId || typeof window === 'undefined') return;
    const googleObj = (window as any).google;
    if (googleObj?.maps?.places) {
      const service = new googleObj.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({ placeId: intake.destinationPlaceId, fields: ['photos'] }, (place: any, status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK && place?.photos?.length > 0) {
          setHeroImage(place.photos[0].getUrl({ maxWidth: 1200, maxHeight: 800 }));
        }
      });
    }
  }, [intake?.destinationPlaceId, trip.id]);

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return '—';
    if (cost === 0) return 'Free';
    if (displayCurrency === 'LOCAL' && !isDomesticTrip) return `${localSymbol}${symbolSpacer}${(cost * exchangeRate).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    return `£${cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  };

  const totalStops = days.reduce((total, day) => total + (day.entries?.filter(e => !(e.type === 'ACCOMMODATION' || e.transitMethod === 'Start of Day' || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(e.activityDescription || '') || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(e.locationName || ''))).length || 0), 0);

  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const apps = essentials?.apps && essentials.apps.length > 0 ? essentials.apps : ['Uber', 'Google Maps'];

  // ── Journal Engine: reads BriefingSemantics, writes first-person journal prose ──
  const generateJournalEntry = (): string => {
    const lines: string[] = [];

    if (briefing.languageBarrier === 'HIGH') {
      lines.push("Gonna need to keep the phrasebook glued to my hand—English isn't widely spoken here.");
    } else if (briefing.languageBarrier === 'MEDIUM') {
      lines.push("English gets me by in tourist spots, but I'll brush up on a few local phrases just in case.");
    } else if (briefing.languageBarrier === 'LOW') {
      lines.push("Don't really need to sweat the language barrier, English is pretty common.");
    }

    if (briefing.tapWaterStatus === 'SAFE') {
      lines.push("Good news: tap water is safe, so I'm packing my reusable bottle.");
    } else if (briefing.tapWaterStatus === 'UNSAFE') {
      lines.push("Note to self: stick strictly to bottled water.");
    }

    if (briefing.tippingNorm === 'PERCENTAGE') {
      lines.push("Looks like tipping a percentage is the norm here—budget accordingly.");
    } else if (briefing.tippingNorm === 'ROUND_UP') {
      lines.push("Tipping isn't a big deal here, just round up the bill and you're golden.");
    } else if (briefing.tippingNorm === 'NONE') {
      lines.push("No tipping expected—service is included, so I can relax on that front.");
    }

    if (briefing.primaryTransit === 'PUBLIC') {
      lines.push("Getting around on public transport—grab a transit card if I can.");
    } else if (briefing.primaryTransit === 'TAXI') {
      lines.push("Taxis and rideshares are the way to go here. Download the local app.");
    } else if (briefing.primaryTransit === 'WALKING') {
      lines.push("This place is walkable—comfortable shoes are non-negotiable.");
    }

    if (lines.length === 0) {
      lines.push(`Can't wait to explore ${trip.destination}. Let the adventure begin.`);
    }

    return lines.join(' ');
  };

  // ── Pocket Items data ────────────────────────────────────────────────────────
  const pocketApps = essentials?.apps && essentials.apps.length > 0
    ? essentials.apps
    : ['Maps', 'Translate'];

  return (
    <div className="w-full min-h-screen font-sans relative notebook-bg-desk flex justify-center py-0 md:py-12 text-slate-900 dark:text-slate-100">
      
      {/* Wood Desk Background */}
      <style dangerouslySetInnerHTML={{__html: `
        .notebook-bg-desk {
          background-color: #e5e0d8;
          background-image: repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.02) 40px, rgba(0,0,0,0.02) 80px);
        }
        .dark .notebook-bg-desk {
          background-color: #121212;
          background-image: none;
        }
        .notebook-paper {
          background-color: #Fdfbf7;
          background-image: linear-gradient(#e8e4d9 1px, transparent 1px);
          background-size: 100% 2.5rem;
        }
        .dark .notebook-paper {
          background-color: #1a1a1a;
          background-image: linear-gradient(#2a2a2a 1px, transparent 1px);
        }
      `}} />

      <PrintOnlyBooklet trip={trip} itinerary={itinerary} formatCost={formatCost} localCurrencyRaw={localCurrencyRaw} totalStops={totalStops} />

      {/* NEW FLEX WRAPPER TO KEEP TABS NEXT TO PAPER */}
      <div className="flex items-start justify-center w-full max-w-6xl mx-auto md:px-8">

        {/* ── THE PHYSICAL NOTEBOOK CONTAINER ── */}
        <div className="notebook-paper relative w-full max-w-4xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] md:border border-stone-300 dark:border-stone-800 md:rounded-sm z-10 flex flex-col">
          
          {selectedPOI && <PlaceDetailsModal placeId={selectedPOI.placeId} poiId={selectedPOI.poiId} tripId={trip.id} tripDocuments={tripDocuments} onClose={() => setSelectedPOI(null)} />}

          {/* ── MOBILE TAPE NAVIGATION (Sticky Top) ── */}
          <div className="md:hidden sticky top-0 z-40 bg-[#FDFBF7]/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border-b border-stone-300 dark:border-stone-700 py-3 shadow-sm w-full">
            <div className="flex overflow-x-auto hide-scrollbar gap-4 px-4">
              <button
                onClick={() => document.getElementById('overview-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="font-handwriting text-xl px-4 py-1 bg-yellow-100 dark:bg-yellow-900/60 shadow-sm border border-yellow-200 dark:border-yellow-700/50 -rotate-1 whitespace-nowrap text-slate-800 dark:text-yellow-50"
              >
                Overview
              </button>
              {days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => document.getElementById(`day-${day.dayNumber}`)?.scrollIntoView({ behavior: 'smooth' })}
                  className="font-handwriting text-xl px-4 py-1 bg-yellow-100 dark:bg-yellow-900/60 shadow-sm border border-yellow-200 dark:border-yellow-700/50 whitespace-nowrap text-slate-800 dark:text-yellow-50"
                  style={{ transform: `rotate(${day.dayNumber % 2 === 0 ? '2deg' : '-2deg'})` }}
                >
                  Day {day.dayNumber}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENT PADDING WRAPPER */}
          <div className="w-full px-4 md:px-12 py-8 relative">
            
            {/* Hero Section */}
            <div className="w-full mb-16 mt-4 md:mt-8">
              <div className="relative mx-auto max-w-xl bg-white dark:bg-[#252525] p-3 pb-16 md:p-4 md:pb-20 shadow-lg -rotate-1 border border-stone-200 dark:border-stone-800">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-stone-100/80 dark:bg-stone-800/80 backdrop-blur-md rotate-2 shadow-sm border border-stone-200/50 dark:border-stone-700/50 z-10" />
                <img src={heroImage} alt={trip.destination} className="w-full h-[250px] object-cover filter sepia-[0.1] dark:brightness-[0.85]" />
                <div className="absolute bottom-6 left-0 w-full text-center">
                  <h1 className="text-4xl md:text-5xl font-handwriting text-slate-800 dark:text-slate-100">{trip.destination}</h1>
                </div>
              </div>
            </div>

            {/* Overview */}
            {essentials && (
              <div id="overview-section" className="scroll-mt-[100px] mb-24 relative">
                <InkSplodge className="absolute -top-10 -right-4 w-32 h-32 rotate-12 pointer-events-none" />

                {/* ── Journal Engine: dynamic semantic prose ── */}
                <div className="font-handwriting text-3xl leading-[1.8] text-slate-800 dark:text-slate-200">
                  <span className="inline-block rotate-[0.5deg]">{generateJournalEntry()}</span>
                </div>

                {/* ── Pocket Items Collage ── CSS Grid; padding provides shadow room; no overflow-hidden ── */}
                <div className="mt-16 mb-8 relative w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start p-4 md:p-0">

                  {/* ── LEFT: Essentials Card + Torn Receipt (anchor column) ── */}
                  <div className="md:col-span-5 flex flex-col gap-10 relative z-10 items-start">

                    {/* Currency Stamp — decorative, positioned on card corner */}
                    {localCurrencyRaw && (
                      <div className="absolute -top-8 -right-6 md:-right-10 w-24 h-24 rounded-full border-[3px] border-slate-800/30 dark:border-slate-200/30 mix-blend-multiply dark:mix-blend-screen flex flex-col items-center justify-center rotate-12 z-20 pointer-events-none bg-amber-50 dark:bg-amber-900/30 shadow-md">
                        <span className="text-[8px] font-bold tracking-widest uppercase opacity-60 text-slate-600 dark:text-slate-400">Currency</span>
                        <span className="text-3xl font-handwriting mt-1 text-slate-900 dark:text-white">{localCurrencyRaw.match(/[A-Z]{3}/)?.[0] || localSymbol}</span>
                      </div>
                    )}

                    <div className="relative p-6 bg-[#f4f0ea] dark:bg-stone-800/80 rounded-sm shadow-md border border-stone-300 dark:border-stone-700 rotate-1">
                      <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-stone-800 dark:bg-stone-900 shadow-inner" />
                      <h4 className="font-handwriting text-2xl text-slate-800 dark:text-slate-200 mb-4 ml-6">The Essentials</h4>
                      <ul className="ml-6 space-y-3 font-typewriter text-sm tracking-widest uppercase text-slate-600 dark:text-slate-400">
                        <li>Dates: <span className="font-bold text-slate-900 dark:text-white">{trip.startDate ? format(new Date(trip.startDate), 'dd/MM/yy') : '—'}</span></li>
                        <li>Power: <span className="font-bold text-slate-900 dark:text-white">{plugType}</span></li>
                        <li>Budget: <span className="font-bold text-slate-900 dark:text-white">{formatCost(trip.budgetGBP)}</span></li>
                        {!isDomesticTrip && (
                          <li>Rate: <span className="font-bold text-slate-900 dark:text-white">£1 = {localSymbol}{exchangeRate.toFixed(2)}</span></li>
                        )}
                      </ul>
                      {/* Explicit currency toggle button */}
                      <button
                        onClick={toggleCurrency}
                        className="mt-6 w-full py-3 bg-stone-200 dark:bg-stone-700 font-typewriter text-[10px] font-bold uppercase tracking-widest text-slate-800 dark:text-slate-100 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors shadow-inner active:translate-y-px flex justify-between px-4 items-center"
                      >
                        <span>Showing Prices In:</span>
                        <span className="bg-white dark:bg-stone-900 px-2 py-1 shadow-sm">
                          {displayCurrency === 'GBP' ? `GBP (£)` : `LOCAL (${localSymbol})`} ⟲
                        </span>
                      </button>
                    </div>
                    {/* Torn Receipt — Financial Summary (anchored in left column) */}
                    <div className="w-full md:w-auto md:max-w-[220px] bg-white dark:bg-stone-300 text-slate-800 p-4 font-typewriter border-t border-b-4 border-b-slate-200 border-dashed shadow-md -rotate-2">
                      <h4 className="text-center border-b border-slate-400 pb-2 mb-2 font-bold text-xs uppercase tracking-widest">Pear Treasury</h4>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Budget:</span>
                        <span>{formatCost(trip.budgetGBP)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span>Est Total:</span>
                        <span>{formatCost(totalCostGBP)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── RIGHT: Scattered notes (flex-wrap collage) ── */}
                  <div className="md:col-span-7 flex flex-row flex-wrap gap-6 md:gap-10 relative z-10 pt-4 md:pt-12 justify-center md:justify-start items-start">

                    {/* Emergency Scrap */}
                    {essentials.emergencyNumbers && (
                      <div className="w-full md:w-auto md:max-w-[220px] bg-white dark:bg-stone-800 p-3 border-2 border-red-500/50 border-dashed -rotate-2 shadow-sm">
                        <p className="font-typewriter text-[10px] uppercase tracking-widest text-red-500 dark:text-red-400 mb-1">🚨 Emergency</p>
                        <p className="font-handwriting text-xl text-slate-800 dark:text-slate-200 leading-snug">{essentials.emergencyNumbers}</p>
                      </div>
                    )}

                    {/* Apps Sticky */}
                    <div className="w-full md:w-auto md:max-w-[220px] bg-yellow-100 dark:bg-yellow-900/40 p-4 shadow-md rotate-3 flex-shrink-0">
                      <p className="font-handwriting text-xl text-slate-700 dark:text-yellow-200 mb-3 border-b border-yellow-300 dark:border-yellow-700/50 pb-1">📲 To Download</p>
                      <ul className="space-y-1">
                        {pocketApps.map((app, i) => (
                          <li key={i} className="font-typewriter text-sm text-slate-700 dark:text-yellow-100 flex items-center gap-2">
                            <span className="w-3 h-3 border border-slate-500 dark:border-yellow-400 rounded-sm inline-block flex-shrink-0" />
                            {app}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Boarding Pass — Transit Details */}
                    {trip.intake?.transitDetails && (
                      <div className="w-full md:w-auto md:max-w-[220px] bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-sm p-3 shadow-sm -rotate-2">
                        <h4 className="font-typewriter text-xs font-bold uppercase text-blue-800 dark:text-blue-300 mb-2">
                          Transit: {trip.intake.transitDetails.mode}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 font-typewriter text-[10px] uppercase text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="opacity-50 block">Outbound</span>
                            <span className="font-bold text-sm">{trip.intake.transitDetails.outbound?.time || 'TBD'}</span>
                            <br />
                            Ref: {trip.intake.transitDetails.outbound?.reference || 'Pending'}
                          </div>
                          <div>
                            <span className="opacity-50 block">Return</span>
                            <span className="font-bold text-sm">{trip.intake.transitDetails.return?.time || 'TBD'}</span>
                            <br />
                            Ref: {trip.intake.transitDetails.return?.reference || 'Pending'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hotel Matchbook — Basecamp / Accommodation */}
                    {basecamps.length > 0 && (
                      <div className="w-full md:w-auto md:max-w-[220px] bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 shadow-sm p-3 rotate-3">
                        <h4 className="font-handwriting text-xl text-rose-900 dark:text-rose-200 border-b border-rose-300 dark:border-rose-700 mb-2">Basecamp</h4>
                        {basecamps.map((stay, idx) => (
                          <div key={idx} className="mb-2">
                            <span className="font-typewriter text-[9px] uppercase opacity-60 text-rose-800 dark:text-rose-300">Day {stay.startDay}</span>
                            <p className="font-handwriting text-lg leading-tight text-rose-900 dark:text-rose-100">{stay.name}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                </div>

                {/* ── Phrasebook (full-width, below the collage) ── */}
                {essentials.usefulPhrases && essentials.usefulPhrases.length > 0 && (
                  <div className="w-full relative p-6 bg-[#f4f0ea] dark:bg-stone-800/80 rounded-sm shadow-md border border-stone-300 dark:border-stone-700 rotate-[0.5deg]">
                    <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-stone-800 dark:bg-stone-900 shadow-inner" />
                    <h4 className="font-handwriting text-2xl text-slate-800 dark:text-slate-200 mb-4 ml-6">Survival Phrases</h4>
                    <ul className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      {essentials.usefulPhrases.map((p, i) => (
                        <li key={i} className="flex justify-between items-end border-b border-stone-300 dark:border-stone-600 pb-1 gap-4">
                          <span className="font-serif italic text-slate-600 dark:text-slate-400 text-sm">{p.phrase}</span>
                          <span className="font-handwriting text-lg text-slate-900 dark:text-white whitespace-nowrap">{p.translation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}

            {/* Days (Stacking on mobile, static on desktop) */}
            {days.map((activeDay, dayIdx) => (
              <div key={activeDay.dayNumber} id={`day-${activeDay.dayNumber}`} className="scroll-mt-[80px] md:scroll-mt-[40px] mb-24 relative">
                
                {/* The Header (Sticky on Mobile) */}
                <div className="sticky top-[58px] md:static z-20 bg-[#FDFBF7]/95 dark:bg-[#1a1a1a]/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none -mx-4 px-4 md:mx-0 md:px-0 py-4 md:py-0 border-b-2 border-slate-800/40 dark:border-slate-200/20 mb-10 shadow-sm md:shadow-none">
                  <h2 className="font-handwriting text-5xl md:text-6xl text-slate-900 dark:text-white -rotate-1 relative inline-block">
                    Day {activeDay.dayNumber}
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-yellow-200/50 dark:bg-yellow-600/30 -z-10 mix-blend-multiply dark:mix-blend-screen" />
                  </h2>
                </div>

                {/* The Entries */}
                <div className="flex flex-col pl-2 md:pl-8">
                  {(activeDay.entries || []).map((entry, index, arr) => (
                    <TimelineEntryNotebook key={entry.id} entry={entry} nextEntry={arr[index + 1]} isLast={index === arr.length - 1} isOdd={index % 2 !== 0} index={index} accommodationName={accommodationName} onPlaceClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })} formatCost={formatCost} destination={trip.destination} />
                  ))}
                </div>

              </div>
            ))}

          </div>
        </div>

        {/* ── DESKTOP PHYSICAL INDEX TABS (Sticky Sidebar) ── */}
        <div className="hidden md:flex flex-col gap-2 sticky top-32 w-[120px] -ml-[2px] z-0 h-max">
          <button
            onClick={() => document.getElementById('overview-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="font-handwriting text-2xl px-4 py-2 bg-yellow-100 dark:bg-yellow-900 border border-l-0 border-stone-300 dark:border-stone-700 shadow-[4px_4px_10px_rgba(0,0,0,0.1)] rounded-r-md text-slate-800 dark:text-yellow-50 text-left hover:pr-6 hover:-translate-y-0.5 transition-all"
          >
            Briefing
          </button>
          {days.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => document.getElementById(`day-${day.dayNumber}`)?.scrollIntoView({ behavior: 'smooth' })}
              className="font-handwriting text-2xl px-4 py-2 bg-yellow-100 dark:bg-yellow-900 border border-l-0 border-stone-300 dark:border-stone-700 shadow-[4px_4px_10px_rgba(0,0,0,0.1)] rounded-r-md text-slate-800 dark:text-yellow-50 text-left hover:pr-6 hover:-translate-y-0.5 transition-all"
              style={{ transform: `rotate(${day.dayNumber % 2 === 0 ? '1deg' : '-1deg'})` }}
            >
              Day {day.dayNumber}
            </button>
          ))}
          <button
            onClick={onOpenLedger}
            className="font-typewriter text-[10px] uppercase font-bold px-4 py-3 bg-stone-200 dark:bg-stone-800 border border-l-0 border-stone-300 dark:border-stone-700 shadow-md rounded-r-md text-slate-800 dark:text-white mt-8 hover:translate-x-2 transition-all text-left"
          >
            Ledger ↗
          </button>
          <button
            onClick={onOpenDocs}
            className="font-typewriter text-[10px] uppercase font-bold px-4 py-3 bg-stone-200 dark:bg-stone-800 border border-l-0 border-stone-300 dark:border-stone-700 shadow-md rounded-r-md text-slate-800 dark:text-white hover:translate-x-2 transition-all text-left"
          >
            Docs
          </button>
          <button
            onClick={onOpenCalendar}
            className="font-typewriter text-[10px] uppercase font-bold px-4 py-3 bg-stone-200 dark:bg-stone-800 border border-l-0 border-stone-300 dark:border-stone-700 shadow-md rounded-r-md text-slate-800 dark:text-white hover:translate-x-2 transition-all text-left"
          >
            Calendar
          </button>
          <button
            onClick={onEditTrip}
            className="font-typewriter text-[10px] uppercase font-bold px-4 py-3 bg-stone-200 dark:bg-stone-800 border border-l-0 border-stone-300 dark:border-stone-700 shadow-md rounded-r-md text-slate-800 dark:text-white hover:translate-x-2 transition-all text-left"
          >
            Edit
          </button>
        </div>

      </div>

      {/* ── MOBILE TACTILE SPEED DIAL ── */}
      <div className="md:hidden fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">

        {/* Overlay — first child so it renders behind buttons in the stacking context */}
        {isDialOpen && (
          <div className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20 backdrop-blur-[1px]" onClick={() => setIsDialOpen(false)} />
        )}

        {/* The Expanding Menu Items — relative z-50 keeps them above the z-40 overlay */}
        <div className={`relative z-50 flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${isDialOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'}`}>
          <button onClick={() => { setIsDialOpen(false); onOpenLedger(); }} className="flex items-center gap-3 group">
            <span className="font-handwriting text-xl text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-stone-800/80 px-2 py-1 rotate-2 shadow-sm border border-stone-200 dark:border-stone-700">Ledger</span>
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 border-2 border-stone-300 dark:border-stone-600 flex items-center justify-center shadow-md -rotate-3 text-lg">🧮</div>
          </button>
          <button onClick={() => { setIsDialOpen(false); onOpenDocs(); }} className="flex items-center gap-3 group">
            <span className="font-handwriting text-xl text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-stone-800/80 px-2 py-1 -rotate-1 shadow-sm border border-stone-200 dark:border-stone-700">Docs</span>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 border-2 border-stone-300 dark:border-stone-600 flex items-center justify-center shadow-md rotate-2 text-lg">📎</div>
          </button>
          <button onClick={() => { setIsDialOpen(false); onOpenCalendar(); }} className="flex items-center gap-3 group">
            <span className="font-handwriting text-xl text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-stone-800/80 px-2 py-1 rotate-1 shadow-sm border border-stone-200 dark:border-stone-700">Export</span>
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 border-2 border-stone-300 dark:border-stone-600 flex items-center justify-center shadow-md -rotate-2 text-lg">📅</div>
          </button>
          <button onClick={() => { setIsDialOpen(false); onEditTrip(); }} className="flex items-center gap-3 group">
            <span className="font-handwriting text-xl text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-stone-800/80 px-2 py-1 -rotate-2 shadow-sm border border-stone-200 dark:border-stone-700">Edit</span>
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 border-2 border-stone-300 dark:border-stone-600 flex items-center justify-center shadow-md rotate-3 text-lg">✏️</div>
          </button>
        </div>

        {/* The Main Trigger Button — relative z-50 keeps it above the z-40 overlay */}
        <button
          onClick={() => setIsDialOpen(!isDialOpen)}
          className="w-14 h-14 rounded-full bg-stone-800 dark:bg-stone-200 border-4 border-stone-200 dark:border-stone-800 text-white dark:text-stone-900 flex items-center justify-center shadow-lg transition-transform active:scale-95 relative z-50"
        >
          <span className={`text-2xl transition-transform duration-300 ${isDialOpen ? 'rotate-45' : 'rotate-0'}`}>
            {isDialOpen ? '✖' : '🎒'}
          </span>
        </button>

      </div>

    </div>
  );
}