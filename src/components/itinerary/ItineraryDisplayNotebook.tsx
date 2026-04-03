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

function generateGoogleMapsDayUrl(entries: ItineraryEntry[], destinationCity: string): string | null {
  const validEntries = entries.filter(e => 
    e.locationName && 
    !/(airport|flight|arrival|departure)/i.test(e.locationName + ' ' + (e.activityDescription || '')) &&
    e.locationName !== 'Room Break' && 
    e.locationName !== 'Local Coffee / Cafe Break'
  );
  if (validEntries.length === 0) return null;
  if (validEntries.length === 1) {
     return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(validEntries[0].locationName + ', ' + destinationCity)}`;
  }
  const origin = validEntries[0];
  const dest = validEntries[validEntries.length - 1];
  const waypoints = validEntries.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${encodeURIComponent(origin.locationName + ', ' + destinationCity)}`;
  url += `&destination=${encodeURIComponent(dest.locationName + ', ' + destinationCity)}`;
  if (waypoints.length > 0) {
     const limitedWaypoints = waypoints.slice(0, 9);
     url += `&waypoints=${limitedWaypoints.map(w => encodeURIComponent(w.locationName + ', ' + destinationCity)).join('|')}`;
  }
  return url;
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

function TimelineEntryNotebook({ 
  entry, nextEntry, isLast, isOdd, accommodationName, destination, onPlaceClick, formatCost 
}: { 
  entry: ItineraryEntry; nextEntry?: ItineraryEntry; isLast: boolean; isOdd: boolean; accommodationName?: string; destination: string; onPlaceClick: (placeId: string, poiId: string) => void; formatCost: (cost?: number) => string;
}) {
  const hasPlaceId = !!(entry.placeId && entry.placeId !== "null" && entry.placeId !== "");
  const isBookend = (entry.type === 'ACCOMMODATION' || entry.transitMethod === 'Start of Day') && !entry.isDining;
  
  let displayTitle = entry.locationName || 'Unknown Location';
  if (isBookend && accommodationName && /^(accommodation|hotel|airbnb|start of day)/i.test(displayTitle.trim())) {
    displayTitle = accommodationName;
  }

  // FIXED: Removed strict overlap checks to clear TS Error 2367
  const getMarginDoodle = () => {
    if (isBookend) return null;
    const isDining = entry.isDining || /lunch|dinner|breakfast|cafe|restaurant|eat/i.test(entry.activityDescription + ' ' + entry.locationName);
    
    if (isDining) {
      return <span className="font-handwriting text-xs text-slate-500 -rotate-6 inline-block mt-3 opacity-60 dark:opacity-40">(dining)</span>;
    }
    
    const isTransit = entry.transitMethod && !entry.transitMethod.toLowerCase().includes('walk') && entry.transitMethod !== 'Start of Day';
    if (isTransit) {
      return <span className="font-handwriting text-xs text-slate-500 rotate-6 inline-block mt-3 opacity-60 dark:opacity-40">travel →</span>;
    }
    
    return <span className="font-handwriting text-xs text-slate-500 -rotate-3 inline-block mt-3 opacity-60 dark:opacity-40">explore</span>;
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
        
        <div onClick={() => hasPlaceId && onPlaceClick(entry.placeId!, entry.id)} className={`flex-1 group ${hasPlaceId ? 'cursor-pointer' : 'cursor-default'} relative ${isOdd ? 'md:ml-12' : 'md:ml-0'}`}>
          <div className="absolute inset-0 bg-white/40 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity -mx-4 px-4 rounded-xl -rotate-1 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h4 className="text-3xl md:text-4xl font-handwriting leading-none text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-amber-300 transition-colors inline-block relative">
                  {displayTitle}
                </h4>
                <p className="text-base md:text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-serif italic max-w-2xl mt-3">{entry.activityDescription?.replace(/^\[.*?\]\s*/, '')}</p>
              </div>
              {!isBookend && <span className="flex-shrink-0 text-xl font-handwriting text-green-700 dark:text-emerald-400 -rotate-2 mt-1">{formatCost(entry.estimatedCostGBP)}</span>}
            </div>

            {!isLast && nextEntry && nextEntry.transitNote && (
               <div className="mt-6 w-max">
                 <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(displayTitle + ', ' + destination)}&destination=${encodeURIComponent(nextEntry.locationName + ', ' + destination)}&travelmode=${getGoogleMapsTravelMode(nextEntry.transitMethod)}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs md:text-sm font-typewriter uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all`} title={`Get directions to ${nextEntry.locationName}`}>
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

// FIXED: Renamed onEditRequest to onEditAction to clear TS Error 71007
export default function ItineraryDisplayNotebook({ itinerary, trip, onEditAction }: { itinerary: Itinerary; trip: ClientTripProps; onEditAction?: () => void; }) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const [activeTab, setActiveTab] = useState<'overview' | number>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [isFilingCabinetOpen, setIsFilingCabinetOpen] = useState(false);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);

  const { exchangeRate, setExchangeRate, displayCurrency, intake } = useTripStore();

  useEffect(() => { setViewMode('list'); }, [activeTab]);

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

    const hlYellow = "bg-[#fef08a]/80 dark:bg-[#ca8a04]/40 text-slate-900 dark:text-white px-1.5 py-0.5 mx-1 font-bold rounded-sm inline-block -rotate-1 mix-blend-multiply dark:mix-blend-screen shadow-[1px_1px_2px_rgba(254,240,138,0.5)]";
    const hlPink = "bg-[#fbcfe8]/80 dark:bg-[#be185d]/40 text-slate-900 dark:text-white px-1.5 py-0.5 mx-1 font-bold rounded-sm inline-block rotate-1 mix-blend-multiply dark:mix-blend-screen shadow-[1px_1px_2px_rgba(251,207,232,0.5)]";
    const hlGreen = "bg-[#bbf7d0]/80 dark:bg-[#15803d]/40 text-slate-900 dark:text-white px-1.5 py-0.5 mx-1 font-bold rounded-sm inline-block -rotate-1 mix-blend-multiply dark:mix-blend-screen shadow-[1px_1px_2px_rgba(187,247,208,0.5)]";

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
    <div className="w-full min-h-screen font-sans relative overflow-x-hidden text-slate-900 dark:text-white notebook-bg-itinerary">
      
      {/* FIXED: Removed the red margin line from the main itinerary background */}
      <style dangerouslySetInnerHTML={{__html: `
        .notebook-bg-itinerary {
          background-color: #Fdfbf7;
          background-image: linear-gradient(#e8e4d9 1px, transparent 1px);
          background-size: 100% 2.5rem;
        }
        .dark .notebook-bg-itinerary {
          background-color: #121212;
          background-image: linear-gradient(#2a2a2a 1px, transparent 1px);
        }
      `}} />

      <PrintOnlyBooklet trip={trip} itinerary={itinerary} formatCost={formatCost} localCurrencyRaw={localCurrencyRaw} totalStops={totalStops} />

      <div className="print:hidden relative z-10 flex flex-col md:flex-row max-w-6xl mx-auto px-4 md:px-8 pb-32">
        
        <FilingCabinet isOpen={isFilingCabinetOpen} onClose={() => setIsFilingCabinetOpen(false)} tripId={trip.id} availablePOIs={days.flatMap(d => d.entries.map(e => ({ id: e.id, name: e.locationName, dayName: `Day ${d.dayNumber}` })))} documents={tripDocuments} onUploadSuccess={loadDocuments} />
        {selectedPOI && <PlaceDetailsModal placeId={selectedPOI.placeId} poiId={selectedPOI.poiId} tripId={trip.id} tripDocuments={tripDocuments} onClose={() => setSelectedPOI(null)} onDocumentUpdate={loadDocuments} />}

        {/* ── MOBILE TABS (Paper Index) ── */}
        <div className="md:hidden sticky top-20 z-30 mb-8 -mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-2 py-4 items-end backdrop-blur-sm">
          <button onClick={() => setActiveTab('overview')} className={`px-5 py-2 border border-b-0 rounded-t-md transition-all duration-200 ${activeTab === 'overview' ? 'bg-[#Fdfbf7] dark:bg-[#1a1a1a] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-md z-10 scale-105' : 'bg-[#e5e0d8] dark:bg-[#2a2a2a] border-slate-300/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400'}`}>
            <span className="font-handwriting text-2xl whitespace-nowrap">Briefing</span>
          </button>
          {days.map((day) => (
            <button key={day.dayNumber} onClick={() => setActiveTab(day.dayNumber)} className={`px-5 py-2 border border-b-0 rounded-t-md transition-all duration-200 ${activeTab === day.dayNumber ? 'bg-[#Fdfbf7] dark:bg-[#1a1a1a] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-md z-10 scale-105' : 'bg-[#e5e0d8] dark:bg-[#2a2a2a] border-slate-300/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400'}`}>
              <span className="font-handwriting text-2xl whitespace-nowrap">Day {day.dayNumber}</span>
            </button>
          ))}
          <button onClick={() => window.print()} className="ml-auto px-3 py-2 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 shadow-sm text-slate-700 dark:text-slate-300">
            🖨️
          </button>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 w-full pt-4 md:pt-16 max-w-4xl mx-auto relative z-10">
          
          {/* THE POLAROID HERO */}
          <div className="w-full mb-16">
            <div className="relative mx-auto max-w-xl bg-[#fff] dark:bg-[#1e1e1e] p-4 pb-20 md:p-5 md:pb-24 shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)] -rotate-1 group border border-slate-200 dark:border-[#333]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#fdf8f0]/80 dark:bg-[#2d2d2d]/80 backdrop-blur-md rotate-3 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#e5e0d8]/50 dark:border-[#444] z-10" />
              <img src={heroImage} alt={trip.destination} className="w-full h-[250px] md:h-[350px] object-cover filter sepia-[0.15] contrast-[0.95] dark:brightness-90" />
              
              <div className="absolute bottom-16 left-8 right-8 h-px bg-slate-300/50 dark:bg-slate-700/50 rotate-[0.5deg]" />
              
              <div className="absolute bottom-4 left-0 w-full text-center">
                <h1 className="text-4xl md:text-5xl font-handwriting text-slate-800 dark:text-[#f0f0f0] drop-shadow-sm">{trip.destination}</h1>
              </div>
            </div>
          </div>

          {/* OVERVIEW / BRIEFING */}
          {essentials && (
            <div className={`animate-fade-in ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
              <div className="flex flex-col gap-16 relative">
                
                {/* The Coffee Ring Smudge */}
                <div className="absolute top-16 right-0 md:-right-8 w-32 h-32 rounded-full border-4 border-amber-800/10 dark:border-amber-200/5 opacity-40 pointer-events-none mix-blend-multiply dark:mix-blend-screen"
                 style={{ boxShadow: 'inset 0 0 12px rgba(120,80,40,0.1)' }} 
                />
                
                {humanizeBriefing()}

                {/* Stamped Luggage Tag */}
                <div className="relative w-full max-w-md mx-auto p-6 bg-[#f4f0ea] dark:bg-[#222] rounded-lg shadow-md border border-[#e0d6c8] dark:border-[#333] rotate-[-1deg]">
                  <div className="absolute -top-8 left-6 w-0.5 h-12 bg-[#8c6b5d] dark:bg-[#111] -rotate-12 z-0" />
                  <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-[#Fdfbf7] dark:bg-[#121212] shadow-inner z-10 border border-[#e0d6c8] dark:border-[#333]" />
                  
                  <div className="ml-8 grid grid-cols-1 gap-5 border-l-2 border-dashed border-red-400/40 pl-4">
                    <div>
                      <h4 className="text-sm font-handwriting text-slate-500 dark:text-slate-400 mb-0.5">Dates</h4>
                      <p className="font-typewriter text-sm font-bold text-slate-900 dark:text-[#e0e0e0] uppercase tracking-widest">{trip.startDate && trip.endDate ? `${format(new Date(trip.startDate), 'dd/MM/yy')} - ${format(new Date(trip.endDate), 'dd/MM/yy')}` : `${trip.duration} Days`}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-handwriting text-slate-500 dark:text-slate-400 mb-0.5">Power</h4>
                      <p className="font-typewriter text-sm font-bold text-slate-900 dark:text-[#e0e0e0] uppercase tracking-widest">{plugType}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-handwriting text-slate-500 dark:text-slate-400 mb-0.5">Apps to download</h4>
                      <p className="font-typewriter text-sm font-bold text-slate-900 dark:text-[#e0e0e0] uppercase tracking-widest">{apps.join(', ')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-12 items-start mt-4">
                  {trip.intake?.transitDetails && ['Flight', 'Train'].includes(trip.intake.transitDetails.mode) && (
                    <div className="relative flex-1 w-full">
                      <div className="absolute -top-3 left-4 w-16 h-6 bg-[#bbf7d0]/60 dark:bg-[#14532d]/40 backdrop-blur-md -rotate-6 shadow-sm border border-[#bbf7d0]/30 z-10" />
                      <div className="border-2 border-dashed border-slate-400 dark:border-slate-600 p-6 bg-[#fefce8] dark:bg-[#1e1e1e] rotate-1 shadow-sm">
                        <h2 className="font-handwriting text-3xl text-slate-900 dark:text-amber-100 mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">Transit: {trip.intake.transitDetails.mode}</h2>
                        <div className="mb-4">
                          <p className="font-typewriter text-[10px] text-slate-500 uppercase tracking-widest">Outbound Time</p>
                          <p className="font-typewriter text-xl font-bold text-slate-900 dark:text-[#e0e0e0]">{trip.intake.transitDetails.outbound?.time || 'TBD'}</p>
                          <p className="font-handwriting text-lg text-slate-600 dark:text-slate-400 mt-1">Ref: {trip.intake.transitDetails.outbound?.reference || 'Pending'}</p>
                        </div>
                        <div>
                          <p className="font-typewriter text-[10px] text-slate-500 uppercase tracking-widest">Return Time</p>
                          <p className="font-typewriter text-xl font-bold text-slate-900 dark:text-[#e0e0e0]">{trip.intake.transitDetails.return?.time || 'TBD'}</p>
                          <p className="font-handwriting text-lg text-slate-600 dark:text-slate-400 mt-1">Ref: {trip.intake.transitDetails.return?.reference || 'Pending'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative flex-1 w-full">
                    <div className="absolute -top-3 right-4 w-16 h-6 bg-[#fbcfe8]/60 dark:bg-[#831843]/40 backdrop-blur-md rotate-6 shadow-sm border border-[#fbcfe8]/30 z-10" />
                    <div className="bg-white dark:bg-[#1e1e1e] p-6 shadow-md -rotate-1 border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="font-handwriting text-3xl text-slate-900 dark:text-[#f0f0f0] border-b border-slate-300 dark:border-slate-600 pb-2">Our Basecamp</h2>
                      </div>
                      {dynamicStays.length > 0 ? (
                        <div className="flex flex-col gap-6">
                          {dynamicStays.map((stay, idx) => (
                            <div key={idx}>
                              <p className="font-typewriter text-xs text-slate-500 uppercase tracking-widest">Day {stay.startDay}</p>
                              <h3 className="font-handwriting text-3xl text-slate-900 dark:text-[#e0e0e0] mt-1">{stay.name}</h3>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="font-handwriting text-2xl text-slate-500">Need to book a place!</p>
                      )}
                    </div>
                  </div>
                </div>

                {essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-handwriting text-4xl text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                      <span>Phrasebook</span>
                      <span className="h-px bg-slate-400 dark:bg-slate-700 flex-1 border-dashed" />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                      {essentials.usefulPhrases.slice(0,8).map((p, i) => (
                        <div key={i} className="flex flex-col border-b border-slate-300/50 dark:border-slate-700/50 pb-2">
                          <span className="font-handwriting text-3xl text-slate-900 dark:text-[#e0e0e0]">{p.phrase}</span>
                          <span className="font-serif italic text-slate-600 dark:text-slate-400 pl-4">{p.translation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* THE TORN RECEIPT */}
                <div className="mt-16 mb-8 flex justify-center w-full">
                  <div className="bg-[#f8f9fa] dark:bg-[#d1d5db] text-slate-800 p-8 shadow-[2px_4px_16px_rgba(0,0,0,0.15)] dark:shadow-[2px_4px_16px_rgba(0,0,0,0.8)] rotate-2 relative w-full sm:w-96 font-typewriter border-x border-slate-200 dark:border-slate-400">
                    <div className="absolute top-[-8px] left-0 right-0 h-[8px] bg-[radial-gradient(circle,transparent,transparent_4px,#f8f9fa_4px,#f8f9fa_10px)] dark:bg-[radial-gradient(circle,transparent,transparent_4px,#d1d5db_4px,#d1d5db_10px)] bg-[length:16px_16px]" />
                    
                    <div className="text-center mb-6 border-b-2 border-dashed border-slate-400 pb-4">
                      <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">Pear Treasury</h2>
                      <p className="text-[10px] mt-1 text-slate-500">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    
                    <div className="flex justify-between items-end mb-4 text-sm">
                      <span className="uppercase text-slate-600">Target Budget</span>
                      <span className="font-bold text-slate-900">{formatCost(trip.budgetGBP)}</span>
                    </div>
                    
                    <div className="flex justify-between items-end mb-6 text-sm">
                      <span className="uppercase text-slate-600">Est. Total</span>
                      <span className="font-bold text-lg text-slate-900">{formatCost(dynamicTotalCost)}</span>
                    </div>

                    <div className="border-t-2 border-slate-800 pt-4 flex flex-col items-center gap-4">
                      <p className="text-xs font-bold text-center uppercase tracking-widest bg-slate-900 text-white px-2 py-1">Rate: £1 = {localSymbol}{exchangeRate.toFixed(2)}</p>
                      <Link href={`/itinerary/${trip.id}/ledger`} className="text-[10px] uppercase tracking-widest text-blue-700 hover:text-blue-900 underline decoration-blue-400 mt-2 font-bold">
                        View Interactive Ledger ↗
                      </Link>
                    </div>

                    <div className="absolute bottom-[-8px] left-0 right-0 h-[8px] bg-[radial-gradient(circle,transparent,transparent_4px,#f8f9fa_4px,#f8f9fa_10px)] dark:bg-[radial-gradient(circle,transparent,transparent_4px,#d1d5db_4px,#d1d5db_10px)] bg-[length:16px_16px] rotate-180" />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* DAY VIEWS */}
          {days.map(activeDay => (
            <div key={activeDay.dayNumber} className={`${activeTab === activeDay.dayNumber ? 'flex' : 'hidden'} flex-col animate-fade-in`}>
              <div className="flex justify-between items-end mb-10 border-b-2 border-slate-800/60 dark:border-slate-200/40 pb-4">
                <h2 className="font-handwriting text-5xl md:text-6xl text-slate-900 dark:text-white -rotate-1 relative inline-block">
                  <span className="relative z-10">Day {activeDay.dayNumber}</span>
                  <span className="absolute bottom-2 left-0 w-full h-4 bg-yellow-200/50 dark:bg-amber-500/40 -z-10 mix-blend-multiply dark:mix-blend-screen" />
                </h2>
                <button onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')} className="font-typewriter text-[10px] md:text-xs font-bold uppercase tracking-widest border border-slate-400 dark:border-slate-600 px-3 py-1.5 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-colors bg-white/50 dark:bg-[#1e1e1e]/80 text-slate-800 dark:text-[#e0e0e0]">
                  {viewMode === 'list' ? 'View Map' : 'View Timeline'}
                </button>
              </div>
              
              {viewMode === 'list' || typeof window === 'undefined' ? (
                <div className="flex flex-col">
                  {(activeDay.entries || []).map((entry, index, arr) => (
                    <TimelineEntryNotebook key={`${entry.id}-${entry.time}`} entry={entry} nextEntry={arr[index + 1]} isLast={index === arr.length - 1} isOdd={index % 2 !== 0} accommodationName={accommodationName} onPlaceClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })} formatCost={formatCost} destination={trip.destination} />
                  ))}
                </div>
              ) : (
                <div className="h-[60vh] min-h-[500px] w-full border-4 md:border-8 border-white dark:border-[#333] shadow-xl relative -rotate-1 bg-slate-200">
                   <DayMap entries={activeDay.entries || []} destination={trip.destination} onMarkerClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })} />
                </div>
              )}

              <div className="mt-16 ml-auto w-max text-right">
                <p className="font-handwriting text-2xl text-slate-600 dark:text-slate-400 mb-1">Spent today:</p>
                <p className="font-handwriting text-5xl text-slate-900 dark:text-white rotate-2 border-b border-dashed border-slate-400 dark:border-slate-600 pb-1">{formatCost(activeDay.estimatedDailySpendGBP || 0)}</p>
              </div>
            </div>
          ))}

        </div>

        {/* ── DESKTOP BINDER TABS (Paper Style) ── */}
        <div className="hidden md:flex flex-col gap-4 sticky top-32 h-max pl-8 pr-2 pt-16 z-0">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`text-left px-5 py-3 rounded-r-lg transition-all duration-300 relative border border-l-0 ${activeTab === 'overview' ? 'bg-[#Fdfbf7] dark:bg-[#1a1a1a] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-[4px_4px_10px_rgba(0,0,0,0.05)] w-[110%] z-10 font-bold' : 'bg-[#e5e0d8] dark:bg-[#2a2a2a] border-slate-300/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:w-[105%]'}`}
          >
            <span className="font-handwriting text-3xl whitespace-nowrap">Briefing</span>
          </button>
          
          {days.map((day) => (
            <button 
              key={day.dayNumber} 
              onClick={() => setActiveTab(day.dayNumber)} 
              className={`text-left px-5 py-3 rounded-r-lg transition-all duration-300 relative border border-l-0 ${activeTab === day.dayNumber ? 'bg-[#Fdfbf7] dark:bg-[#1a1a1a] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-[4px_4px_10px_rgba(0,0,0,0.05)] w-[110%] z-10 font-bold' : 'bg-[#e5e0d8] dark:bg-[#2a2a2a] border-slate-300/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:w-[105%]'}`}
            >
              <span className="font-handwriting text-3xl whitespace-nowrap">Day {day.dayNumber}</span>
            </button>
          ))}
          
          <div className="mt-12 w-full flex flex-col gap-6 items-start pl-2 z-10">
             <Link href={`/itinerary/${trip.id}/ledger`} className="font-typewriter text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-[#1a1a1a] bg-[#bbf7d0] dark:bg-[#4ade80] px-4 py-2 border border-slate-800 shadow-[2px_2px_0px_#1e293b] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#1e293b] transition-all rotate-2">
               Open Ledger ↗
             </Link>
             <button onClick={() => { if (onEditAction) onEditAction(); else setActiveTab(1); }} className="font-typewriter text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2">
               ✏️ Edit Trip
             </button>
             <button onClick={() => window.print()} className="font-typewriter text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2">
               🖨️ Print Journal
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}