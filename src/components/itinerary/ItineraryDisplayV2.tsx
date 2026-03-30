'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import type { Itinerary, DayItinerary, ItineraryEntry, TransitMethod } from '@/types';
import PlaceDetailsModal, { DocumentInfo } from './PlaceDetailsModal';
import FilingCabinet from './FilingCabinet';
import DayMap from './DayMap';
import { useTripStore } from '@/store/tripStore';
import { fetchTripDocuments } from '@/app/actions/documents';
import { fetchTripWeather, DailyWeather } from '@/app/actions/weather';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake?: any;
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️'; 
  if (code === 1 || code === 2 || code === 3) return '🌤️'; 
  if (code >= 45 && code <= 48) return '🌫️'; 
  if (code >= 51 && code <= 67) return '🌧️'; 
  if (code >= 71 && code <= 77) return '❄️'; 
  if (code >= 80 && code <= 82) return '🌦️'; 
  if (code >= 95 && code <= 99) return '⛈️'; 
  return '⛅'; 
}

const TRANSIT_CONFIG: Record<TransitMethod, { emoji: string; colour: string; bgColour: string }> = {
  'Walking':          { emoji: '🚶', colour: 'text-emerald-700 dark:text-emerald-400', bgColour: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' },
  'Tube':             { emoji: '🚇', colour: 'text-blue-700 dark:text-blue-400',    bgColour: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'       },
  'Bus':              { emoji: '🚌', colour: 'text-orange-700 dark:text-orange-400',  bgColour: 'bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800'   },
  'Metro':            { emoji: '🚊', colour: 'text-purple-700 dark:text-purple-400',  bgColour: 'bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800'   },
  'Tram':             { emoji: '🚋', colour: 'text-teal-700 dark:text-teal-400',    bgColour: 'bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800'       },
  'Taxi / Rideshare': { emoji: '🚕', colour: 'text-yellow-700 dark:text-yellow-400',  bgColour: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800'   },
  'Train':            { emoji: '🚂', colour: 'text-red-700 dark:text-red-400',     bgColour: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'         },
  'Ferry':            { emoji: '⛴️', colour: 'text-cyan-700 dark:text-cyan-400',    bgColour: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/30 dark:border-cyan-800'       },
  'Cycling':          { emoji: '🚲', colour: 'text-lime-700 dark:text-lime-400',    bgColour: 'bg-lime-50 border-lime-200 dark:bg-lime-900/30 dark:border-lime-800'       },
  'Start of Day':     { emoji: '🌅', colour: 'text-slate-700 dark:text-slate-400',   bgColour: 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'     },
};

function getTransitConfig(method?: TransitMethod) { return TRANSIT_CONFIG[method ?? 'Start of Day'] ?? TRANSIT_CONFIG['Start of Day']; }

function parseTimeToMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function formatSuggestedDuration(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min${mins === 1 ? '' : 's'}`;
  if (mins === 0) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  return `${hrs} hour${hrs === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
}

function parseTransitMinutes(note: string | undefined): number {
  if (!note) return 0;
  const match = note.match(/(\d+)\s*min/);
  return match ? parseInt(match[1], 10) : 0;
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
     const placeIdParam = validEntries[0].placeId && validEntries[0].placeId !== "null" ? `&query_place_id=${validEntries[0].placeId}` : '';
     return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(validEntries[0].locationName + ', ' + destinationCity)}${placeIdParam}`;
  }
  const origin = validEntries[0];
  const dest = validEntries[validEntries.length - 1];
  const waypoints = validEntries.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${encodeURIComponent(origin.locationName + ', ' + destinationCity)}`;
  if (origin.placeId && origin.placeId !== "null") url += `&origin_place_id=${origin.placeId}`;
  url += `&destination=${encodeURIComponent(dest.locationName + ', ' + destinationCity)}`;
  if (dest.placeId && dest.placeId !== "null") url += `&destination_place_id=${dest.placeId}`;
  if (waypoints.length > 0) {
     const limitedWaypoints = waypoints.slice(0, 9);
     url += `&waypoints=${limitedWaypoints.map(w => encodeURIComponent(w.locationName + ', ' + destinationCity)).join('|')}`;
     const wpPlaceIds = limitedWaypoints.map(w => (w.placeId && w.placeId !== "null") ? w.placeId : '');
     if (wpPlaceIds.some(id => id !== '')) url += `&waypoint_place_ids=${wpPlaceIds.join('|')}`;
  }
  return url;
}

// ── Print Booklet ─────────────────────────────────────────
function PrintOnlyBooklet({ trip, itinerary, formatCost, localCurrencyRaw, totalStops }: { trip: ClientTripProps; itinerary: Itinerary; formatCost: (c?: number) => string; localCurrencyRaw: string; totalStops: number; }) {
  return <div className="hidden">Print logic omitted for V2 rewrite brevity (keep your V1 logic here if needed in production)</div>;
}

// ── Timeline Entry ───────────────────────────────────────
function TimelineEntry({ 
  entry, nextEntry, isLast, dayNumber, accommodationName, destination, onPlaceClick, formatCost 
}: { 
  entry: ItineraryEntry; nextEntry?: ItineraryEntry; isLast: boolean; dayNumber: number; accommodationName?: string; destination: string; onPlaceClick: (placeId: string, poiId: string) => void; formatCost: (cost?: number) => string;
}) {
  const isStartDay = entry.transitMethod === 'Start of Day';
  const hasPlaceId = !!(entry.placeId && entry.placeId !== "null" && entry.placeId !== "");
  const isManualRest = entry.locationName === 'Room Break' || entry.locationName === 'Local Coffee / Cafe Break';
  const isBookend = !isManualRest && (entry.type === 'ACCOMMODATION' || isStartDay || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.activityDescription || '') || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.locationName || '')) && !entry.isDining;
  const isFlight = /(Airport|Flight|Departure)/i.test(entry.activityDescription || '') || /(Airport|Flight|Departure)/i.test(entry.locationName || '');
  const isStay = isBookend && !isFlight;

  let displayTitle = entry.locationName || 'Unknown Location';
  let displayDesc = entry.activityDescription?.replace(/^\[.*?\]\s*/, '') ?? '';
  if (isStay) {
    const isGeneric = /^(accommodation|hotel|airbnb|start of day|return to)/i.test(displayTitle.trim());
    if (isGeneric && accommodationName) displayTitle = accommodationName;
  }
  
  const currentMinutes = parseTimeToMinutes(entry.time);
  const nextMinutes = parseTimeToMinutes(nextEntry?.time);
  const transitMinutes = parseTransitMinutes(nextEntry?.transitNote);
  const durationMinutes = currentMinutes !== null && nextMinutes !== null ? Math.max(0, nextMinutes - currentMinutes - transitMinutes) : null;
  const nextTransitConfig = getTransitConfig(nextEntry?.transitMethod);

  return (
    <div className="flex flex-col py-2">
      <div className="flex gap-6 items-start">
        <div className="flex w-16 flex-shrink-0 flex-col items-end pt-1 border-r border-slate-200 dark:border-slate-800 pr-6">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono tracking-tighter">
            {entry.time ?? '—'}
          </span>
        </div>
        <div onClick={() => hasPlaceId && onPlaceClick(entry.placeId!, entry.id)} className={`flex-1 pb-8 group ${hasPlaceId ? 'cursor-pointer' : 'cursor-default'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h4 className={`text-xl font-serif leading-snug transition-colors ${hasPlaceId ? 'text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300' : 'text-slate-900 dark:text-white'}`}>{displayTitle}</h4>
                {hasPlaceId && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayTitle + ', ' + destination)}&query_place_id=${entry.placeId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="relative z-10 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-none transition-colors">Map ↗</a>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-light max-w-2xl">{displayDesc}</p>
            </div>
            {!isBookend && <span className="flex-shrink-0 text-xs font-mono text-slate-400 pt-1">{formatCost(entry.estimatedCostGBP)}</span>}
          </div>
        </div>
      </div>
      {!isLast && nextEntry && (
        <div className="flex gap-4 pl-[88px] pb-6 -mt-4">
          <div className="flex flex-col justify-center">
            {nextEntry.transitNote && (
              <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(displayTitle + ', ' + destination)}&destination=${encodeURIComponent(nextEntry.locationName + ', ' + destination)}&travelmode=${getGoogleMapsTravelMode(nextEntry.transitMethod)}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all`} title={`Get directions to ${nextEntry.locationName}`}>
                <span className="opacity-50">{nextTransitConfig.emoji}</span><span>{nextEntry.transitNote}</span><span className="ml-1 opacity-50">↗</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component (V2 Premium) ───────────────────────────────────────────────────────
export default function ItineraryDisplayV2({ itinerary, trip, onEditRequest }: { itinerary: Itinerary; trip: ClientTripProps; onEditRequest?: () => void; }) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const [activeTab, setActiveTab] = useState<'overview' | number>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [isFilingCabinetOpen, setIsFilingCabinetOpen] = useState(false);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);

  const { exchangeRate, setExchangeRate, displayCurrency, toggleCurrency, intake } = useTripStore();
  const [weatherData, setWeatherData] = useState<DailyWeather[] | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [destinationUtcOffset, setDestinationUtcOffset] = useState<number | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { setViewMode('list'); }, [activeTab]);

  useEffect(() => {
    async function loadWeather() {
      const data = await fetchTripWeather(trip.destination, trip.startDate, trip.duration || days.length);
      if (data) setWeatherData(data);
    }
    loadWeather();
  }, [trip.destination, trip.startDate, trip.duration, days.length]);
  
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
        .then((res) => { if (!res.ok) throw new Error('API down'); return res.json(); })
        .then((data) => { if (data.rates && data.rates[targetCurrency]) setExchangeRate(data.rates[targetCurrency]); })
        .catch(() => console.warn("Fallback exchange rate."));
    } else if (targetCurrency === 'GBP') {
       setExchangeRate(1);
    }
  }, [localCurrencyRaw, setExchangeRate]);

  const [heroImage, setHeroImage] = useState<string>(`https://picsum.photos/seed/${trip.id}/1200/600`);
  useEffect(() => {
    if (!intake?.destinationPlaceId || typeof window === 'undefined') return;
    const googleObj = (window as any).google;
    if (googleObj?.maps?.places) {
      const service = new googleObj.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({ placeId: intake.destinationPlaceId, fields: ['photos', 'utc_offset_minutes'] }, (place: any, status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK) {
          if (place?.photos?.length > 0) setHeroImage(place.photos[0].getUrl({ maxWidth: 1200, maxHeight: 600 }));
          if (place?.utc_offset_minutes !== undefined) setDestinationUtcOffset(place.utc_offset_minutes);
        }
      });
    }
  }, [intake?.destinationPlaceId]);

  let localTimeStr = '--:--';
  let destTimeStr = '--:--';
  if (now) {
    localTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (destinationUtcOffset !== null) {
      const destDate = new Date(now.getTime() + (destinationUtcOffset * 60000));
      destTimeStr = destDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    }
  }

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
  const tapWater = essentials?.tapWater || 'Safe to drink';
  const apps = essentials?.apps && essentials.apps.length > 0 ? essentials.apps : ['Uber', 'Google Maps'];
  const risk = essentials?.contextualRisk || 'Stay alert in crowds.';

  return (
    <div className="w-full font-sans print:hidden bg-white dark:bg-slate-950 min-h-screen">
      
      {/* Modals */}
      <FilingCabinet isOpen={isFilingCabinetOpen} onClose={() => setIsFilingCabinetOpen(false)} tripId={trip.id} availablePOIs={days.flatMap(d => d.entries.map(e => ({ id: e.id, name: e.locationName, dayName: `Day ${d.dayNumber}` })))} documents={tripDocuments} onUploadSuccess={loadDocuments} />
      {selectedPOI && <PlaceDetailsModal placeId={selectedPOI.placeId} poiId={selectedPOI.poiId} tripId={trip.id} tripDocuments={tripDocuments} onClose={() => setSelectedPOI(null)} onDocumentUpdate={loadDocuments} />}

      {/* ── THE MAGAZINE HERO ── */}
      <div className="relative w-full h-[50vh] min-h-[450px] overflow-hidden bg-slate-900">
        <img src={heroImage} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
        
        <div className="absolute bottom-16 left-0 w-full px-6 max-w-5xl mx-auto flex flex-col items-start">
          <p className="text-brand-300 font-serif italic text-xl md:text-2xl mb-2 tracking-wide">A curated journey to</p>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif text-white tracking-tight leading-none mb-6">
            {trip.destination}
          </h1>
          <div className="flex flex-wrap items-center gap-6 border-t border-white/20 pt-6 mt-2 text-white/80 font-mono text-xs uppercase tracking-widest">
            <span>{trip.startDate && trip.endDate ? `${format(new Date(trip.startDate), 'MMM d')} – ${format(new Date(trip.endDate), 'MMM d, yyyy')}` : `${trip.duration} Days`}</span>
            <span className="w-1 h-1 bg-brand-500 rounded-full" />
            <span>{days.length} Days</span>
            <span className="w-1 h-1 bg-brand-500 rounded-full" />
            <span>{totalStops} Stops</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 relative mt-16">
        
        {/* ── EDITORIAL TABS ── */}
        <div className="sticky top-16 md:top-16 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pt-6 pb-4 mb-16 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-10 overflow-x-auto hide-scrollbar px-2">
            <button onClick={() => setActiveTab('overview')} className={`pb-4 text-xs font-mono tracking-[0.2em] uppercase transition-colors relative whitespace-nowrap ${activeTab === 'overview' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
              The Guide
              {activeTab === 'overview' && <span className="absolute bottom-0 left-0 w-full h-px bg-slate-900 dark:bg-white" />}
            </button>
            {days.map((day) => (
              <button key={day.dayNumber} onClick={() => setActiveTab(day.dayNumber)} className={`pb-4 text-xs font-mono tracking-[0.2em] uppercase transition-colors relative whitespace-nowrap ${activeTab === day.dayNumber ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                Day {day.dayNumber}
                {activeTab === day.dayNumber && <span className="absolute bottom-0 left-0 w-full h-px bg-slate-900 dark:bg-white" />}
              </button>
            ))}
          </div>
        </div>

        {typeof activeTab === 'number' && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] md:hidden">
             <button onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')} className="bg-slate-900 text-white rounded-none px-8 py-4 flex items-center gap-3 font-mono text-xs uppercase tracking-widest shadow-2xl border border-slate-700">
               {viewMode === 'list' ? <>View Map</> : <>View Timeline</>}
             </button>
          </div>
        )}

        <div className="pb-32">
          
          {/* ── THE CURATED GUIDE (V2 LUXURY OVERVIEW) ── */}
          {essentials && (
            <div className={`animate-fade-in ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
              
              <div className="flex flex-col gap-24 max-w-3xl mx-auto">
                
                {/* 1. THE EDITORIAL BRIEFING */}
                <div className="relative">
                  <p className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.4] text-slate-800 dark:text-slate-200">
                    In {trip.destination}, you'll navigate primarily by <span className="italic text-brand-600 dark:text-brand-400">{essentials.airportTransit.toLowerCase().includes('uber') || essentials.airportTransit.toLowerCase().includes('taxi') ? 'taxi and rideshare' : 'local transit'}</span>. 
                    The locals speak <span className="italic text-brand-600 dark:text-brand-400">{essentials.language || 'the local language'}</span> 
                    <span className="text-xl md:text-2xl text-slate-400 font-serif"> (English is {essentials.englishProficiency?.toLowerCase() || 'moderate'})</span>. 
                    When dining out, <span className="italic text-brand-600 dark:text-brand-400">{essentials.tippingEtiquette?.toLowerCase() || 'tip around 10%'}</span>. 
                    And take note: the tap water is <span className="italic text-brand-600 dark:text-brand-400">{tapWater.toLowerCase().includes('safe') ? 'safe to drink' : 'not recommended'}</span>.
                  </p>

                  <div className="mt-12 flex flex-wrap gap-4 border-t border-slate-200 dark:border-slate-800 pt-8">
                    <span className="px-4 py-1.5 text-slate-500 font-mono text-[10px] uppercase tracking-widest border border-slate-300 dark:border-slate-700">🔌 {plugType}</span>
                    <span className="px-4 py-1.5 text-slate-500 font-mono text-[10px] uppercase tracking-widest border border-slate-300 dark:border-slate-700">🚨 {risk}</span>
                    {apps.map((app, i) => (
                      <span key={i} className="px-4 py-1.5 text-slate-500 font-mono text-[10px] uppercase tracking-widest border border-slate-300 dark:border-slate-700">📱 {app}</span>
                    ))}
                  </div>
                </div>

                {/* 2. THE AIRMAIL TRANSIT TICKET */}
                {trip.intake?.transitDetails && ['Flight', 'Train'].includes(trip.intake.transitDetails.mode) && (
                  <div>
                    <h2 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-6 flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span>Transit Documents</span>
                      <span className="text-brand-500">{trip.intake.transitDetails.mode}</span>
                    </h2>
                    
                    <div className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 p-8 flex flex-col md:flex-row justify-between gap-12 relative">
                      {/* Decorative Airmail Edge (Optional visual flair) */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px,#3b82f6_20px,#3b82f6_30px,transparent_30px,transparent_40px)] opacity-50" />
                      
                      <div className="flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4">Outbound</p>
                        <div className="text-5xl font-serif text-slate-900 dark:text-white mb-2">{trip.intake.transitDetails.outbound?.time || 'TBD'}</div>
                        <div className="text-sm font-sans text-slate-500 mb-6">Arrive {trip.destination}</div>
                        <div className="font-mono text-xs uppercase tracking-widest text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-4">
                          Ref // {trip.intake.transitDetails.outbound?.reference || 'PENDING'}
                        </div>
                      </div>

                      <div className="hidden md:block w-px bg-slate-300 dark:bg-slate-700" />
                      <div className="md:hidden h-px w-full bg-slate-300 dark:bg-slate-700" />

                      <div className="flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4">Return</p>
                        <div className="text-5xl font-serif text-slate-900 dark:text-white mb-2">{trip.intake.transitDetails.return?.time || 'TBD'}</div>
                        <div className="text-sm font-sans text-slate-500 mb-6">Depart {trip.destination}</div>
                        <div className="font-mono text-xs uppercase tracking-widest text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-4">
                          Ref // {trip.intake.transitDetails.return?.reference || 'PENDING'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. THE RESIDENCE (Accommodation) */}
                <div>
                  <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-6">
                    <h2 className="text-[10px] font-mono uppercase tracking-widest text-slate-400">The Residence</h2>
                    <button onClick={() => { if (onEditRequest) onEditRequest(); else setActiveTab(1); }} className="text-[9px] font-mono uppercase tracking-widest text-brand-600 hover:text-brand-500">
                      Manage ↗
                    </button>
                  </div>
                  
                  {dynamicStays.length > 0 ? (
                    <div className="flex flex-col gap-6">
                      {dynamicStays.map((stay, idx) => {
                        const hasPlaceId = !!(stay.placeId && stay.placeId !== "null" && stay.placeId !== "");
                        const mapsUrl = hasPlaceId ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name + ', ' + trip.destination)}&query_place_id=${stay.placeId}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name + ', ' + trip.destination)}`;

                        return (
                          <div key={idx} className="group flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer" onClick={() => hasPlaceId && setSelectedPOI({ placeId: stay.placeId!, poiId: stay.poiId })}>
                            <div>
                              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-2">Check-in Day {stay.startDay}</p>
                              <h3 className="text-3xl font-serif text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{stay.name}</h3>
                            </div>
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-max text-[9px] font-mono uppercase tracking-widest text-slate-500 border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                              Map ↗
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-lg font-serif italic text-slate-500">No accommodation scheduled yet. Let the Matchmaker suggest an area, or pin one to your timeline.</p>
                  )}
                </div>

                {/* 4. THE PHRASEBOOK */}
                {essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 && (
                  <div>
                    <h2 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">The Phrasebook</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
                      {essentials.usefulPhrases.slice(0,8).map((p, i) => (
                        <div key={i} className="flex justify-between items-baseline">
                          <span className="text-sm font-sans text-slate-500">{p.phrase}</span>
                          <span className="text-lg font-serif text-slate-900 dark:text-white">{p.translation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. THE TREASURY (Ledger) */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 md:p-12">
                  <h2 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-8 border-b border-slate-300 dark:border-slate-700 pb-2 flex justify-between">
                    <span>The Treasury</span>
                    <button onClick={toggleCurrency} className="text-brand-600 hover:text-brand-500">{displayCurrency === 'GBP' ? 'View Local' : 'View GBP'}</button>
                  </h2>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-12">
                    <div>
                      <p className="text-xs font-sans text-slate-500 mb-2">Estimated Itinerary Spend</p>
                      <div className="text-6xl font-serif text-slate-900 dark:text-white leading-none mb-4">
                        {formatCost(dynamicTotalCost)}
                      </div>
                      <p className="text-sm font-sans text-slate-500 border-l-2 border-slate-300 pl-3">
                        of your {formatCost(trip.budgetGBP)} initial budget
                      </p>
                    </div>

                    <div className="w-full md:w-auto text-left md:text-right border-t border-slate-200 dark:border-slate-800 md:border-0 pt-6 md:pt-0">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">Current Exchange</p>
                      <div className="text-2xl font-serif text-slate-900 dark:text-white mb-1">£1 = {localSymbol}{exchangeRate.toFixed(2)}</div>
                      <p className="text-xs font-sans text-slate-500">{localCurrencyRaw}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── DAY VIEWS (The Itinerary) ── */}
          {days.map(activeDay => {
            const isActiveTab = activeTab === activeDay.dayNumber;
            const mapUrl = generateGoogleMapsDayUrl(activeDay.entries, trip.destination);
            
            return (
              <div key={activeDay.dayNumber} className={`${isActiveTab ? 'flex' : 'hidden'} flex-col lg:flex-row gap-12 lg:gap-20 animate-fade-in max-w-5xl mx-auto`}>
                
                <div className="flex-1">
                  {viewMode === 'list' || typeof window === 'undefined' ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16 border-b border-slate-200 dark:border-slate-800 pb-6">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-brand-500 mb-2">Schedule</p>
                          <h2 className="text-5xl font-serif text-slate-900 dark:text-white">Day {activeDay.dayNumber}</h2>
                        </div>
                        {mapUrl && (
                          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-max items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            Open Maps ↗
                          </a>
                        )}
                      </div>
                      
                      <div className="flex flex-col">
                        {(activeDay.entries || []).map((entry, index, arr) => (
                          <TimelineEntry key={`${entry.id}-${entry.time}`} entry={entry} nextEntry={arr[index + 1]} isLast={index === arr.length - 1} dayNumber={activeDay.dayNumber} accommodationName={accommodationName} onPlaceClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })} formatCost={formatCost} destination={trip.destination} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[65vh] min-h-[600px] w-full border border-slate-200 dark:border-slate-800 relative">
                       <DayMap entries={activeDay.entries || []} destination={trip.destination} onMarkerClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })} />
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-64 flex-shrink-0">
                  <div className="sticky top-40 flex flex-col gap-12">
                    
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setViewMode('list')} className={`text-left py-2 text-[10px] font-mono uppercase tracking-widest border-b transition-all ${viewMode === 'list' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'}`}>
                        Read Timeline
                      </button>
                      <button onClick={() => setViewMode('map')} className={`text-left py-2 text-[10px] font-mono uppercase tracking-widest border-b transition-all ${viewMode === 'map' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'}`}>
                        View Live Map
                      </button>
                    </div>
                    
                    <div>
                      <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                        <span>Day {activeDay.dayNumber} Spend</span>
                        {!isDomesticTrip && <button onClick={toggleCurrency} className="text-brand-600 hover:text-brand-500">{displayCurrency === 'GBP' ? 'LOCAL' : 'GBP'}</button>}
                      </h3>
                      
                      <div className={`text-4xl font-serif leading-none mb-2 ${(activeDay.estimatedDailySpendGBP || 0) > (trip.budgetGBP / trip.duration) ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                        {formatCost(activeDay.estimatedDailySpendGBP || 0)}
                      </div>
                      <div className="text-sm font-sans text-slate-400 mb-6">
                        / {formatCost(trip.budgetGBP / trip.duration)} limit
                      </div>

                      {/* Cumulative Spend Tracker */}
                      {(() => {
                        const currentDayNum = activeDay.dayNumber;
                        const spendToDate = days.filter(d => d.dayNumber <= currentDayNum).reduce((sum, d) => sum + (d.estimatedDailySpendGBP || 0), 0);
                        return (
                          <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">Spend to Date</p>
                            <p className="text-lg font-serif text-slate-900 dark:text-white">{formatCost(spendToDate)}</p>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}