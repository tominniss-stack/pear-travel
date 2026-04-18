'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import Link from 'next/link';
import type { Itinerary, ItineraryEntry } from '@/types';
import PlaceDetailsModal, { DocumentInfo } from './PlaceDetailsModal';
import FilingCabinet from './FilingCabinet';
import DayMap from './DayMap';
import { useTripStore } from '@/store/tripStore';
import { fetchTripDocuments } from '@/app/actions/documents';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake?: any;
}

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
                  {phrases.map((p, i) => (
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

      {days.map(day => (
        <div key={day.dayNumber} className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
            <h2 className="text-3xl font-serif text-black">Day {day.dayNumber}</h2>
          </div>
          <table className="w-full text-base font-sans">
            <tbody>
              {day.entries.map((entry, idx) => (
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

export default function ItineraryDisplayNotebook({ itinerary, trip, onEditAction }: { itinerary: Itinerary; trip: ClientTripProps; onEditAction?: () => void; }) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [isFilingCabinetOpen, setIsFilingCabinetOpen] = useState(false);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);

  const { exchangeRate, setExchangeRate, displayCurrency, intake } = useTripStore();
  const accommodationName = intake?.accommodation || trip.intake?.accommodation;

  const loadDocuments = () => { fetchTripDocuments(trip.id).then(docs => setTripDocuments(docs as DocumentInfo[])); };
  useEffect(() => { loadDocuments(); }, [trip.id]);

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

  const dynamicStays = days.reduce((acc: {name: string, startDay: number, placeId?: string, poiId: string}[], day) => {
    if (day.entries.length > 0) {
      const stayEntry = day.entries.find(e => (e.type === 'ACCOMMODATION' || /(accommodation|hotel|airbnb|check-in|stay)/i.test(e.activityDescription || '') || /(accommodation|hotel|airbnb)/i.test(e.locationName || '')) && !/(airport|flight|arrival|departure|station|terminal)/i.test(e.locationName + ' ' + e.activityDescription)) || day.entries.find(e => e.transitMethod === 'Start of Day' && !/(airport|flight|arrival|departure|station)/i.test(e.locationName + ' ' + e.activityDescription));
      if (stayEntry) {
        const lastStay = acc[acc.length - 1];
        const isGeneric = /^(accommodation|hotel|airbnb|start of day)/i.test(stayEntry.locationName?.trim() || '');
        const displayName = (isGeneric && accommodationName) ? accommodationName : (stayEntry.locationName || 'Unknown Stay');
        if (!lastStay || lastStay.name !== displayName) acc.push({ name: displayName, startDay: day.dayNumber, placeId: stayEntry.placeId, poiId: stayEntry.id });
      }
    }
    return acc;
  }, []);

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return '—';
    if (cost === 0) return 'Free';
    if (displayCurrency === 'LOCAL' && !isDomesticTrip) return `${localSymbol}${symbolSpacer}${(cost * exchangeRate).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    return `£${cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  };

  const totalStops = days.reduce((total, day) => total + (day.entries?.filter(e => !(e.type === 'ACCOMMODATION' || e.transitMethod === 'Start of Day' || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(e.activityDescription || '') || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(e.locationName || ''))).length || 0), 0);
  const dynamicTotalCost = days.reduce((sum, day) => sum + day.entries.reduce((dSum, e) => dSum + (e.estimatedCostGBP || 0), 0), 0);
  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const apps = essentials?.apps && essentials.apps.length > 0 ? essentials.apps : ['Uber', 'Google Maps'];

  const humanizeBriefing = () => {
    if (!essentials) return null;
    const transit = essentials.airportTransit.toLowerCase().includes('uber') || essentials.airportTransit.toLowerCase().includes('taxi') ? 'taxis and rideshares' : 'local transit networks';
    const englishText = essentials.englishProficiency || 'Moderate';
    const tipping = (essentials.tippingEtiquette || '10%').replace(/\.+$/, '');
    const water = essentials.tapWater?.toLowerCase().includes('safe') ? 'perfectly safe' : 'best avoided';

    const hlYellow = "bg-[#fef08a]/80 dark:bg-[#b45309]/50 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 mx-1 font-bold rounded-sm inline-block -rotate-1 mix-blend-multiply dark:mix-blend-screen shadow-[1px_1px_2px_rgba(254,240,138,0.5)]";
    const hlPink = "bg-[#fbcfe8]/80 dark:bg-[#9d174d]/50 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 mx-1 font-bold rounded-sm inline-block rotate-1 mix-blend-multiply dark:mix-blend-screen shadow-[1px_1px_2px_rgba(251,207,232,0.5)]";
    const hlGreen = "bg-[#bbf7d0]/80 dark:bg-[#166534]/50 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 mx-1 font-bold rounded-sm inline-block -rotate-1 mix-blend-multiply dark:mix-blend-screen shadow-[1px_1px_2px_rgba(187,247,208,0.5)]";

    return (
      <div className="font-handwriting text-3xl leading-[1.8] text-slate-800 dark:text-slate-200 rotate-[0.5deg]">
        <p className="mb-6">
          Looks like getting around <span className="font-bold text-slate-900 dark:text-white border-b-2 border-slate-800/30 dark:border-slate-200/30">{trip.destination}</span> will be mostly done via <span className={hlYellow}>{transit}</span>. 
          English proficiency here is <span className={hlPink}>{englishText}</span>, so keep the phrasebook handy!
        </p>
        <p className="mb-6">
          When grabbing food or service, the norm is <span className={hlGreen}>{tipping}</span>. 
          Oh, and we checked—the tap water is <span className={hlYellow}>{water}</span>.
        </p>
      </div>
    );
  };

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
          
          <FilingCabinet isOpen={isFilingCabinetOpen} onClose={() => setIsFilingCabinetOpen(false)} tripId={trip.id} availablePOIs={days.flatMap(d => d.entries.map(e => ({ id: e.id, name: e.locationName, dayName: `Day ${d.dayNumber}` })))} documents={tripDocuments} onUploadSuccess={loadDocuments} />
          {selectedPOI && <PlaceDetailsModal placeId={selectedPOI.placeId} poiId={selectedPOI.poiId} tripId={trip.id} tripDocuments={tripDocuments} onClose={() => setSelectedPOI(null)} onDocumentUpdate={loadDocuments} />}

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
                <InkSplodge className="absolute -top-10 -right-4 w-32 h-32 rotate-12" />
                {humanizeBriefing()}
                
                <div className="mt-12 relative w-full max-w-sm p-6 bg-[#f4f0ea] dark:bg-stone-800/80 rounded-sm shadow-md border border-stone-300 dark:border-stone-700 rotate-1">
                   <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-stone-800 dark:bg-stone-900 shadow-inner" />
                   <h4 className="font-handwriting text-2xl text-slate-800 dark:text-slate-200 mb-4 ml-6">The Essentials</h4>
                   <ul className="ml-6 space-y-3 font-typewriter text-sm tracking-widest uppercase text-slate-600 dark:text-slate-400">
                      <li>Dates: <span className="font-bold text-slate-900 dark:text-white">{trip.startDate ? format(new Date(trip.startDate), 'dd/MM/yy') : ''}</span></li>
                      <li>Power: <span className="font-bold text-slate-900 dark:text-white">{plugType}</span></li>
                      <li>Budget: <span className="font-bold text-slate-900 dark:text-white">{formatCost(trip.budgetGBP)}</span></li>
                   </ul>
                </div>
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
           <Link href={`/itinerary/${trip.id}/ledger`} className="font-typewriter text-[10px] uppercase font-bold px-4 py-3 bg-stone-200 dark:bg-stone-800 border border-l-0 border-stone-300 dark:border-stone-700 shadow-md rounded-r-md text-slate-800 dark:text-white mt-8 hover:translate-x-2 transition-all">
            Ledger ↗
          </Link>
          <button onClick={() => { if (onEditAction) onEditAction(); }} className="font-typewriter text-[10px] uppercase font-bold px-4 py-3 bg-stone-200 dark:bg-stone-800 border border-l-0 border-stone-300 dark:border-stone-700 shadow-md rounded-r-md text-slate-800 dark:text-white hover:translate-x-2 transition-all text-left">
            Edit
          </button>
        </div>

      </div>
    </div>
  );
}