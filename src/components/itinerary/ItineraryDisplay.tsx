'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Itinerary, DayItinerary, ItineraryEntry, TransitMethod } from '@/types';
import PlaceDetailsModal, { DocumentInfo } from './PlaceDetailsModal';
import FilingCabinet from './FilingCabinet';
import { useTripStore } from '@/store/tripStore';
import { fetchTripDocuments } from '@/app/actions/documents';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake?: any; // Added fallback to catch DB intake if store is wiped
}

// ── Smart SVG Plug Icon Generator ─────────────────────────────────────────────

function PlugSocketIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  
  if (t.includes('g')) { // UK / Type G
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
        <rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
        <rect x="10.5" y="6" width="3" height="4" fill="currentColor" stroke="none" rx="0.5" />
        <rect x="5.5" y="13" width="4" height="2.5" fill="currentColor" stroke="none" rx="0.5" />
        <rect x="14.5" y="13" width="4" height="2.5" fill="currentColor" stroke="none" rx="0.5" />
      </svg>
    );
  }
  if (t.includes('a') || t.includes('b')) { // US / Type A/B
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
        <rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
        <rect x="7.5" y="8" width="2" height="6" fill="currentColor" stroke="none" rx="0.5" />
        <rect x="14.5" y="8" width="2" height="6" fill="currentColor" stroke="none" rx="0.5" />
        {t.includes('b') && <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />}
      </svg>
    );
  }
  if (t.includes('i')) { // AU / NZ / Type I
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
        <rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
        <line x1="7.5" y1="8" x2="10" y2="11.5" strokeWidth="2" strokeLinecap="round" />
        <line x1="16.5" y1="8" x2="14" y2="11.5" strokeWidth="2" strokeLinecap="round" />
        <rect x="11" y="14" width="2" height="4" fill="currentColor" stroke="none" rx="0.5" />
      </svg>
    );
  }
  // Default / EU (Type C/F)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      <circle cx="8.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Helpers & Config ─────────────────────────────────────────────────────────

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

function getTransitConfig(method?: TransitMethod) {
  return TRANSIT_CONFIG[method ?? 'Start of Day'] ?? TRANSIT_CONFIG['Start of Day'];
}

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

// ── Sub-component: Timeline Entry ─────────────────────────────────────────────

function TimelineEntry({ 
  entry, nextEntry, isLast, dayNumber, accommodationName, onPlaceClick, formatCost 
}: { 
  entry: ItineraryEntry; 
  nextEntry?: ItineraryEntry; 
  isLast: boolean; 
  dayNumber: number; 
  accommodationName?: string; 
  onPlaceClick: (placeId: string, poiId: string) => void; 
  formatCost: (cost?: number) => string;
}) {
  const isStartDay = entry.transitMethod === 'Start of Day';
  const hasPlaceId = !!(entry.placeId && entry.placeId !== "" && entry.placeId !== "null");
  
  const isBookend = entry.isAccommodation || isStartDay || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.activityDescription || '') || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.locationName || '');
  const isFlight = /(Airport|Flight|Departure)/i.test(entry.activityDescription || '') || /(Airport|Flight|Departure)/i.test(entry.locationName || '');
  const isStay = isBookend && !isFlight;

  let displayTitle = entry.locationName || 'Unknown Location';
  let displayDesc = entry.activityDescription?.replace(/^\[.*?\]\s*/, '') ?? '';

  if (isStay) {
    const isGeneric = /^(accommodation|hotel|airbnb|start of day|return to)/i.test(displayTitle.trim());
    if (isGeneric && accommodationName) {
      displayTitle = accommodationName;
    }
  }
  
  const currentMinutes = parseTimeToMinutes(entry.time);
  const nextMinutes = parseTimeToMinutes(nextEntry?.time);
  const transitMinutes = parseTransitMinutes(nextEntry?.transitNote);

  const durationMinutes = currentMinutes !== null && nextMinutes !== null
      ? Math.max(0, nextMinutes - currentMinutes - transitMinutes)
      : null;

  const nextTransitConfig = getTransitConfig(nextEntry?.transitMethod);

  return (
    <div className="flex flex-col">
      <div className="flex gap-4 items-start">
        <div className="flex w-16 flex-shrink-0 flex-col items-end pt-1">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {entry.time ?? '—'}
            {entry.isFixed && <span className="text-[10px] ml-0.5">📌</span>}
          </span>
        </div>

        <div className="flex flex-col items-center flex-shrink-0 pt-1.5 relative">
          <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 ${
            entry.isDining ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/50' : 
            isStartDay ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/50' : 
            'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
          }`}>
            <span className="text-[10px]">{entry.isDining ? '🍽' : isStartDay ? '🌅' : '●'}</span>
          </div>
        </div>

        <div 
          onClick={() => hasPlaceId && onPlaceClick(entry.placeId!, entry.id)}
          className={`flex-1 mb-2 rounded-2xl border p-5 transition-all duration-200 group ${
            hasPlaceId 
              ? 'cursor-pointer hover:-translate-y-0.5 shadow-sm hover:shadow-md hover:border-brand-400' 
              : 'cursor-default border-slate-200 dark:border-slate-700'
          } ${
            entry.isDining ? 'bg-amber-50/50 dark:bg-amber-900/10' : 
            isStartDay ? 'bg-brand-50/50 dark:bg-brand-900/10' : 
            'bg-white dark:bg-slate-800/50'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h4 className={`text-base font-bold leading-snug transition-colors ${hasPlaceId ? 'text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300' : 'text-slate-900 dark:text-white'}`}>
                {displayTitle}
              </h4>
              {durationMinutes !== null && durationMinutes > 0 && !isLast && (
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Est. Duration: {formatSuggestedDuration(durationMinutes)}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{displayDesc}</p>
            </div>

            {!isBookend && (
              <span className="flex-shrink-0 rounded-xl px-3 py-1 text-xs font-bold border bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                {formatCost(entry.estimatedCostGBP)}
              </span>
            )}
          </div>
        </div>
      </div>

      {!isLast && nextEntry && (
        <div className="flex gap-4 pl-[78px] py-1">
          <div className="flex w-6 flex-col items-center flex-shrink-0">
            <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 min-h-[32px]" />
          </div>
          <div className="flex flex-col justify-center py-2">
            {nextEntry.transitNote && (
              <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border ${nextTransitConfig.bgColour} ${nextTransitConfig.colour}`}>
                <span>{nextTransitConfig.emoji}</span>
                <span>{nextEntry.transitNote}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ItineraryDisplay({ 
  itinerary, 
  trip, 
  onEditRequest 
}: { 
  itinerary: Itinerary; 
  trip: ClientTripProps; 
  onEditRequest?: () => void;
}) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const [activeTab, setActiveTab] = useState<'overview' | number>('overview');
  
  // ── NEW: Document & Modal State ──
  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [isFilingCabinetOpen, setIsFilingCabinetOpen] = useState(false);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);

  const { exchangeRate, setExchangeRate, displayCurrency, toggleCurrency, intake } = useTripStore();
  
  const accommodationName = intake?.accommodation || trip.intake?.accommodation;

  // ── Document Fetcher ──
  const loadDocuments = () => {
    fetchTripDocuments(trip.id).then(docs => setTripDocuments(docs as DocumentInfo[]));
  };

  useEffect(() => {
    loadDocuments();
  }, [trip.id]);

  // ── Smart Currency Fetcher ──
  const localCurrencyRaw = essentials?.currency || '';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localSymbol === '£' || localCurrencyRaw.includes('GBP');
  const symbolSpacer = localSymbol.length > 1 ? ' ' : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currencyMatch = localCurrencyRaw.match(/[A-Z]{3}/);
    const targetCurrency = currencyMatch ? currencyMatch[0] : null;

    if (targetCurrency && targetCurrency !== 'GBP') {
      const cacheKey = `pear_fx_${targetCurrency}`;
      const timeKey = `pear_fx_time_${targetCurrency}`;
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      const cachedRate = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(timeKey);
      const now = Date.now();

      if (cachedRate && cachedTime && (now - parseInt(cachedTime, 10)) < ONE_DAY_MS) {
        setExchangeRate(parseFloat(cachedRate));
        return;
      }

      fetch(`https://api.frankfurter.app/latest?from=GBP&to=${targetCurrency}`)
        .then((res) => {
          if (!res.ok) throw new Error('Currency API unavailable');
          return res.json();
        })
        .then((data) => {
          if (data.rates && data.rates[targetCurrency]) {
            const newRate = data.rates[targetCurrency];
            setExchangeRate(newRate);
            localStorage.setItem(cacheKey, newRate.toString());
            localStorage.setItem(timeKey, now.toString());
          }
        })
        .catch((err) => console.warn("Using fallback exchange rate.", err));
    } else if (targetCurrency === 'GBP') {
       setExchangeRate(1);
    }
  }, [localCurrencyRaw, setExchangeRate]);

  // ── Hero Image Fetcher ──
  const [heroImage, setHeroImage] = useState<string>(`https://picsum.photos/seed/${trip.id}/1200/600`);
  
  useEffect(() => {
    if (!intake?.destinationPlaceId || typeof window === 'undefined') return;
    const googleObj = (window as any).google;
    if (googleObj?.maps?.places) {
      const dummyDiv = document.createElement('div');
      const service = new googleObj.maps.places.PlacesService(dummyDiv);
      service.getDetails({ placeId: intake.destinationPlaceId, fields: ['photos'] }, (place: any, status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK && place?.photos?.length > 0) {
          setHeroImage(place.photos[0].getUrl({ maxWidth: 1200, maxHeight: 600 }));
        }
      });
    }
  }, [intake?.destinationPlaceId]);

  // ── Dynamic Accommodation Scanner ──
  const dynamicStays = days.reduce((acc: {name: string, startDay: number, placeId?: string, poiId: string}[], day) => {
    if (day.entries.length > 0) {
      const morningBookend = day.entries[0];
      const isStay = morningBookend.isAccommodation || morningBookend?.transitMethod === 'Start of Day' || /(accommodation|hotel|airbnb|start of day)/i.test(morningBookend.activityDescription || '');
      
      if (isStay) {
        const lastStay = acc[acc.length - 1];
        const isGeneric = /^(accommodation|hotel|airbnb|start of day)/i.test(morningBookend.locationName?.trim() || '');
        const displayName = (isGeneric && accommodationName) ? accommodationName : (morningBookend.locationName || 'Unknown Stay');

        if (!lastStay || lastStay.name !== displayName) {
          acc.push({
            name: displayName,
            startDay: day.dayNumber,
            placeId: morningBookend.placeId,
            poiId: morningBookend.id
          });
        }
      }
    }
    return acc;
  }, []);

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return '—';
    if (cost === 0) return 'Free';
    if (displayCurrency === 'LOCAL' && !isDomesticTrip) {
      return `${localSymbol}${symbolSpacer}${(cost * exchangeRate).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    }
    return `£${cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  };

  const totalStops = days.reduce((total, day) => {
    const actualPlaces = day.entries?.filter(entry => {
      const isBookend = entry.isAccommodation || entry.transitMethod === 'Start of Day' || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.activityDescription || '') || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.locationName || '');
      return !isBookend;
    });
    return total + (actualPlaces?.length || 0);
  }, 0);

  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const tapWater = essentials?.tapWater || 'Safe to drink 🚰';
  const apps = essentials?.apps && essentials.apps.length > 0 
    ? essentials.apps 
    : ['Bolt (Taxis)', 'TheFork (Dining)'];
  const phrases = essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 
    ? essentials.usefulPhrases 
    : [
        { phrase: 'Hello', translation: 'Hola' },
        { phrase: 'Thank you', translation: 'Gracias' },
        { phrase: 'The bill, please', translation: 'La cuenta, por favor' }
      ];
  const risk = essentials?.contextualRisk || 'Pickpockets are common around major tourist hubs like the Metro. Keep valuables secure.';

  const leftCardStyle = "rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-6 md:p-8 shadow-sm flex flex-col";
  const rightCardStyle = "rounded-3xl bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-slate-700/50 p-6 md:p-8 shadow-sm flex flex-col backdrop-blur-md";

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 relative">

      {/* ── GLOBALS ── */}
      <FilingCabinet
        isOpen={isFilingCabinetOpen}
        onClose={() => setIsFilingCabinetOpen(false)}
        tripId={trip.id}
        availablePOIs={days.flatMap(d => d.entries.map(e => ({ id: e.id, name: e.locationName, dayName: `Day ${d.dayNumber}` })))}
        documents={tripDocuments}
        onUploadSuccess={loadDocuments}
      />

      {selectedPOI && (
        <PlaceDetailsModal 
          placeId={selectedPOI.placeId} 
          poiId={selectedPOI.poiId}
          tripId={trip.id}
          tripDocuments={tripDocuments}
          onClose={() => setSelectedPOI(null)} 
          onDocumentUpdate={loadDocuments}
        />
      )}
      
      {/* ── HERO ── */}
      <div className="relative w-full h-72 md:h-80 rounded-3xl overflow-hidden shadow-xl group mb-6">
        <img 
          src={heroImage} 
          alt={trip.destination} 
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-8 md:p-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 mb-3 text-xs font-bold uppercase tracking-widest text-brand-900 bg-brand-400 rounded-full shadow-sm">
                Your Travel Booklet
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-2 drop-shadow-md">
                {trip.destination}
              </h1>
              <p className="text-slate-200 text-lg font-medium drop-shadow-md">
                {trip.startDate && trip.endDate 
                  ? `${format(new Date(trip.startDate), 'd MMM')} – ${format(new Date(trip.endDate), 'd MMM yyyy')}` 
                  : `${trip.duration} Days`}
                {' '}· {totalStops} Stops · Est. {formatCost(itinerary.totalEstimatedCostGBP)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Duration', value: `${days.length} days`, emoji: '📅' },
          { label: 'Total Stops', value: `${totalStops} stops`, emoji: '📍' },
          { label: 'Daily Budget', value: formatCost(trip.budgetGBP / (trip.duration || 1)), emoji: '🎯' }, 
          { label: 'Est. Total Cost', value: formatCost(itinerary.totalEstimatedCostGBP), emoji: '💷' }, 
        ].map(({ label, value, emoji }) => (
          <div key={label} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm transition-colors">
            <span className="text-2xl mb-2 block">{emoji}</span>
            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="block text-lg font-bold text-slate-900 dark:text-white mt-1">{value}</span>
          </div>
        ))}
      </div>

      {/* ── STICKY TABS & CABINET BUTTON ── */}
      <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-md pt-4 pb-0 mb-8 border-b border-slate-200 dark:border-slate-700/50 transition-colors">
        <div className="flex items-center justify-between w-full overflow-x-auto hide-scrollbar">
          <div className="flex gap-8 px-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 text-sm font-bold whitespace-nowrap transition-colors relative ${
                activeTab === 'overview' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Overview
              {activeTab === 'overview' && <span className="absolute bottom-0 left-0 w-full h-1 bg-brand-500 dark:bg-brand-400 rounded-t-full shadow-[0_-2px_10px_rgba(74,222,128,0.5)]" />}
            </button>
            
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => setActiveTab(day.dayNumber)}
                className={`pb-4 text-sm font-bold whitespace-nowrap transition-colors relative ${
                  activeTab === day.dayNumber ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Day {day.dayNumber}
                {activeTab === day.dayNumber && <span className="absolute bottom-0 left-0 w-full h-1 bg-slate-900 dark:bg-white rounded-t-full shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(255,255,255,0.3)]" />}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsFilingCabinetOpen(true)}
            className="pb-4 px-2 text-sm font-bold whitespace-nowrap text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2 group"
          >
            <span className="text-lg group-hover:-translate-y-0.5 transition-transform">📎</span> 
            Trip Documents
            {tripDocuments.length > 0 && (
              <span className="bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full text-xs ml-1">
                {tripDocuments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="pb-20">
        
        {activeTab === 'overview' && essentials && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className={`lg:col-span-2 ${leftCardStyle} overflow-hidden`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-brand-500 dark:text-brand-400">🌤️</span> 
                    {trip.startDate ? '5-Day Outlook' : 'Climate & Best Time to Go'}
                  </h3>
                </div>

                {trip.startDate ? (
                  <div className="flex overflow-x-auto sm:grid sm:grid-cols-5 gap-3 pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:pb-0 hide-scrollbar snap-x">
                    {Array.from({ length: days.length || trip.duration }).map((_, i) => {
                      const tripDate = new Date(trip.startDate!);
                      tripDate.setDate(tripDate.getDate() + i);
                      const dayName = format(tripDate, 'EEE');
                      const dateString = format(tripDate, 'd MMM');
                      const isToday = format(tripDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                      return (
                        <div 
                          key={i} 
                          className={`snap-start flex-shrink-0 min-w-[110px] sm:min-w-0 flex flex-col items-center p-4 rounded-2xl border transition-colors ${
                            isToday 
                              ? 'bg-brand-50 border-brand-300 dark:bg-brand-900/30 dark:border-brand-700' 
                              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'
                          }`}
                        >
                          {isToday && <span className="absolute -top-2 bg-brand-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">TODAY</span>}
                          
                          <span className={`text-[10px] font-black uppercase mb-1 ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>
                            {dayName}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            {dateString}
                          </span>
                          
                          <span className="text-3xl mb-2">
                            {['☀️', '🌤️', '🌦️', '☀️', '⛅'][i % 5]}
                          </span>
                          <div className="flex gap-2 font-bold tabular-nums">
                            <span className="text-sm text-slate-900 dark:text-white">22°</span>
                            <span className="text-sm text-slate-400">14°</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Peak Season</span>
                      <span className="block text-xl font-black text-slate-900 dark:text-white mb-2">May – September</span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Warm, dry, and perfect for outdoor exploring. Expect heavier crowds in July and August.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 min-w-[100px]">
                        <span className="text-2xl mb-2">🌡️</span>
                        <span className="text-[10px] font-black uppercase text-slate-400">Avg High</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white mt-1">24°C</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 min-w-[100px]">
                        <span className="text-2xl mb-2">☔</span>
                        <span className="text-[10px] font-black uppercase text-slate-400">Rain Days</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white mt-1">3 / mo</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`${rightCardStyle} h-full justify-between overflow-hidden`}>
                <div>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Local Currency</h3>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{localSymbol}</div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{localCurrencyRaw}</p>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Exchange Rate</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">£1 = {localSymbol}{symbolSpacer}{exchangeRate.toFixed(2)}</span>
                  </div>
                  
                  {!isDomesticTrip && (
                    <button 
                      onClick={toggleCurrency} 
                      className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all rounded-xl text-xs font-black tracking-wide cursor-pointer shadow-sm"
                    >
                      VIEW PRICES IN {displayCurrency === 'GBP' ? 'LOCAL' : 'GBP'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 ${leftCardStyle} overflow-hidden`}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="text-brand-500 dark:text-brand-400">🚆</span> Transport & Comms
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { icon: '✈️', title: 'Airport Transit', content: essentials.airportTransit },
                    { icon: '📱', title: 'Essential Apps', content: apps.join(', ') },
                    { icon: '💳', title: 'Getting Around', content: essentials.transportCardAdvice },
                    { icon: '🚨', title: 'Emergencies', content: essentials.emergencyNumbers },
                  ].map((card) => card.content && (
                    <div key={card.title} className="flex gap-4 items-start">
                      <div className="text-2xl flex-shrink-0 leading-none mt-0.5">{card.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300 mb-1 truncate">{card.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed break-words">{card.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={`${rightCardStyle} gap-6 overflow-hidden`}>
                 <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Local Logistics</h3>
                 
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                      <PlugSocketIcon type={plugType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">Power Outlets</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{plugType}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-xl shadow-sm">💧</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">Tap Water</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tapWater}</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 ${leftCardStyle} overflow-hidden`}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="text-brand-500 dark:text-brand-400">🗣️</span> Cultural Briefing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Survival Phrases</h4>
                    <div className="flex flex-col gap-3">
                      {phrases.map((p, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{p.phrase}</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{p.translation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-start">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-l-4 border-amber-500 p-5 rounded-r-2xl border-y border-r border-slate-200 dark:border-slate-700/50">
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span>⚠️</span> Contextual Risk
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{risk}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`${rightCardStyle} overflow-hidden`}>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 relative z-10">Accommodation</h3>
                
                <div className="relative z-10 flex flex-col flex-1">
                  {dynamicStays.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-4 mb-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {dynamicStays.map((stay, idx) => (
                          <div 
                            key={idx} 
                            className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3 transition-all ${stay.placeId ? 'cursor-pointer hover:border-brand-400 group' : ''}`} 
                            onClick={() => stay.placeId && setSelectedPOI({ placeId: stay.placeId, poiId: stay.poiId })}
                          >
                            <div className="w-6 h-6 flex-shrink-0 bg-brand-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">From Day {stay.startDay}</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white block leading-tight truncate" title={stay.name}>
                                {stay.name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700/50">
                        <button 
                          onClick={() => {
                            if (onEditRequest) {
                              onEditRequest();
                            } else {
                              setActiveTab(1);
                            }
                          }}
                          className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                        >
                          Manage Bookings in Planner
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <span className="text-[10px] font-black uppercase text-brand-500 dark:text-brand-400 tracking-widest block mb-1">Area Recommendation</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white block leading-tight">Central Hub</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                        Based on your selected activities, staying centrally minimises travel time and keeps you close to transit hubs.
                      </p>
                      <div className="mt-auto">
                        <button 
                          onClick={() => {
                            if (onEditRequest) {
                              onEditRequest();
                            } else {
                              setActiveTab(1);
                            }
                          }}
                          className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                        >
                          Add Booking Details
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {typeof activeTab === 'number' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 animate-fade-in">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
                  <span className="text-lg font-black text-white">{activeTab}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Day {activeTab} Schedule</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {days.find(d => d.dayNumber === activeTab)?.entries?.length || 0} stops planned for today.
                  </p>
                </div>
              </div>

              <div className="flex flex-col">
                {(days.find(d => d.dayNumber === activeTab)?.entries || []).map((entry, index, arr) => (
                  <TimelineEntry
                    key={`${entry.id}-${entry.time}`}
                    entry={entry}
                    nextEntry={arr[index + 1]}
                    isLast={index === arr.length - 1}
                    dayNumber={activeTab}
                    accommodationName={accommodationName}
                    onPlaceClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })}
                    formatCost={formatCost}
                  />
                ))}
              </div>
            </div>

            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="sticky top-28 flex flex-col gap-4">
                
                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Day {activeTab} Spend</h3>
                    {!isDomesticTrip && (
                      <button onClick={toggleCurrency} className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        {displayCurrency === 'GBP' ? 'LOCAL £' : 'GBP £'}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <span className={`text-3xl font-black block ${(days.find(d => d.dayNumber === activeTab)?.estimatedDailySpendGBP || 0) > (trip.budgetGBP / trip.duration) ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                        {formatCost(days.find(d => d.dayNumber === activeTab)?.estimatedDailySpendGBP || 0)}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase">Spent</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-700 dark:text-slate-300 block">{formatCost(trip.budgetGBP / trip.duration)}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase">Daily Limit</span>
                    </div>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900 mt-4 border border-slate-200 dark:border-slate-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${(days.find(d => d.dayNumber === activeTab)?.estimatedDailySpendGBP || 0) > (trip.budgetGBP / trip.duration) ? 'bg-red-500' : 'bg-brand-500'}`} 
                      style={{ width: `${Math.min((((days.find(d => d.dayNumber === activeTab)?.estimatedDailySpendGBP || 0) / (trip.budgetGBP / trip.duration)) * 100) || 0, 100)}%` }} 
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#0f172a]/40 p-5 backdrop-blur-sm shadow-sm flex flex-col gap-6">
                  
                  <div>
                    {(() => {
                      const currentDayNum = typeof activeTab === 'number' ? activeTab : days.length;
                      const spendToDate = days
                        .filter(d => d.dayNumber <= currentDayNum)
                        .reduce((sum, d) => sum + (d.estimatedDailySpendGBP || 0), 0);
                      
                      return (
                        <>
                          <div className="flex justify-between items-end mb-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Spend to Date (Day {currentDayNum})</h4>
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white">{formatCost(spendToDate)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${spendToDate > (trip.budgetGBP / trip.duration) * currentDayNum ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-500'}`}
                              style={{ width: `${Math.min((spendToDate / trip.budgetGBP) * 100, 100)}%` }}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Itinerary Cost</h4>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white">{formatCost(itinerary.totalEstimatedCostGBP)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${itinerary.totalEstimatedCostGBP > trip.budgetGBP ? 'bg-red-500' : 'bg-brand-500'}`}
                        style={{ width: `${Math.min((itinerary.totalEstimatedCostGBP / trip.budgetGBP) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 italic">
                      {itinerary.totalEstimatedCostGBP > trip.budgetGBP 
                        ? "Plan is currently over total budget." 
                        : `Plan uses ${Math.round((itinerary.totalEstimatedCostGBP / trip.budgetGBP) * 100)}% of total budget.`}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}