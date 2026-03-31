'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import type { Itinerary, DayItinerary, ItineraryEntry, TransitMethod } from '@/types';
import PlaceDetailsModal, { DocumentInfo } from './PlaceDetailsModal';
import FilingCabinet from './FilingCabinet';
import CollaboratorsModal from './CollaboratorsModal';
import DayMap from './DayMap';
import { useTripStore } from '@/store/tripStore';
import { fetchTripDocuments } from '@/app/actions/documents';
import { fetchTripWeather, DailyWeather } from '@/app/actions/weather';
import CalendarExportModal from './CalendarExportModal';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake?: any;
}

// -- Weather Emoji Mapper --
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

// -- Currency Flag Mapper --
function getCurrencyFlag(currencyCode: string | null): string {
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

// ── Smart SVG Plug Icon Generator ──
function PlugSocketIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes('g')) { 
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
        <rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
        <rect x="10.5" y="6" width="3" height="4" fill="currentColor" stroke="none" rx="0.5" />
        <rect x="5.5" y="13" width="4" height="2.5" fill="currentColor" stroke="none" rx="0.5" />
        <rect x="14.5" y="13" width="4" height="2.5" fill="currentColor" stroke="none" rx="0.5" />
      </svg>
    );
  }
  if (t.includes('a') || t.includes('b')) { 
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
        <rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
        <rect x="7.5" y="8" width="2" height="6" fill="currentColor" stroke="none" rx="0.5" />
        <rect x="14.5" y="8" width="2" height="6" fill="currentColor" stroke="none" rx="0.5" />
        {t.includes('b') && <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />}
      </svg>
    );
  }
  if (t.includes('i')) { 
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
        <rect x="2" y="2" width="20" height="20" rx="4" strokeWidth="1.5" />
        <line x1="7.5" y1="8" x2="10" y2="11.5" strokeWidth="2" strokeLinecap="round" />
        <line x1="16.5" y1="8" x2="14" y2="11.5" strokeWidth="2" strokeLinecap="round" />
        <rect x="11" y="14" width="2" height="4" fill="currentColor" stroke="none" rx="0.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 opacity-70">
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      <circle cx="8.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Helpers & Config ──
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

// ── Sub-component: Print Only Booklet ──
function PrintOnlyBooklet({ 
  trip, 
  itinerary, 
  formatCost, 
  localCurrencyRaw, 
  totalStops 
}: { 
  trip: ClientTripProps; 
  itinerary: Itinerary; 
  formatCost: (c?: number) => string; 
  localCurrencyRaw: string; 
  totalStops: number;
}) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const accommodationName = trip.intake?.accommodation;
  
  const phrases = essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 
    ? essentials.usefulPhrases 
    : [
        { phrase: 'Hello', translation: 'Hola' },
        { phrase: 'Thank you', translation: 'Gracias' },
        { phrase: 'The bill, please', translation: 'La cuenta, por favor' },
      ];

  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const tapWater = essentials?.tapWater || 'Safe to drink 🚰';
  const risk = essentials?.contextualRisk || 'Stay alert around major tourist hubs.';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';

  return (
    <div className="hidden print:block w-full bg-white text-black font-sans print:m-0 print:p-0">
      <div className="print:page-break-after-always pb-8">
        <div className="mb-8 border-b-2 border-black pb-4">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">Your Travel Booklet</p>
          <h1 className="text-5xl font-black mb-2">{trip.destination}</h1>
          <p className="text-lg font-medium text-slate-700">
            {trip.startDate && trip.endDate 
              ? `${format(new Date(trip.startDate), 'd MMM')} – ${format(new Date(trip.endDate), 'd MMM yyyy')}` 
              : `${trip.duration} Days`}
            {' '}· {totalStops} Stops · Est. Budget: {formatCost(trip.budgetGBP)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: Timeline Entry (Web) ──
function TimelineEntry({ 
  entry, nextEntry, isLast, dayNumber, accommodationName, destination, onPlaceClick, formatCost 
}: { 
  entry: ItineraryEntry; 
  nextEntry?: ItineraryEntry; 
  isLast: boolean; 
  dayNumber: number; 
  accommodationName?: string; 
  destination: string; 
  onPlaceClick: (placeId: string, poiId: string) => void; 
  formatCost: (cost?: number) => string;
}) {
  const isStartDay = entry.transitMethod === 'Start of Day';
  const hasPlaceId = !!(entry.placeId && entry.placeId !== "" && entry.placeId !== "null");
  
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
              <div className="flex flex-col md:flex-row md:items-center gap-2 flex-wrap mb-1">
                <h4 className={`text-base font-bold leading-snug transition-colors ${hasPlaceId ? 'text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300' : 'text-slate-900 dark:text-white'}`}>
                  {displayTitle}
                </h4>
                {isStay && !isFlight && hasPlaceId && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayTitle + ', ' + destination)}&query_place_id=${entry.placeId}`} 
                    target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} 
                    className="w-max text-[10px] font-bold uppercase tracking-wider text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md transition-colors"
                  >
                    View Map ↗
                  </a>
                )}
              </div>
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
              <a 
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(displayTitle + ', ' + destination)}&destination=${encodeURIComponent(nextEntry.locationName + ', ' + destination)}&travelmode=${getGoogleMapsTravelMode(nextEntry.transitMethod)}`}
                target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border hover:scale-[1.02] hover:shadow-sm transition-all ${nextTransitConfig.bgColour} ${nextTransitConfig.colour}`}
                title={`Get directions to ${nextEntry.locationName}`}
              >
                <span>{nextTransitConfig.emoji}</span>
                <span>{nextEntry.transitNote}</span>
                <span className="ml-1 opacity-50 text-[10px]">↗</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

// eslint-disable-next-line @next/next/no-server-actions-in-client-components
export default function ItineraryDisplay({ 
  itinerary, 
  trip, 
  onEditRequest 
}: { 
  itinerary: Itinerary; 
  trip: ClientTripProps; 
  onEditRequest?: () => void;
}) {
  const router = useRouter(); 
  
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const [activeTab, setActiveTab] = useState<'overview' | number>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // ── Document & Modal State ──
  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [isFilingCabinetOpen, setIsFilingCabinetOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
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

  useEffect(() => {
    setViewMode('list');
  }, [activeTab]);

  useEffect(() => {
    async function loadWeather() {
      const data = await fetchTripWeather(trip.destination, trip.startDate, trip.duration || days.length);
      if (data) setWeatherData(data);
    }
    loadWeather();
  }, [trip.destination, trip.startDate, trip.duration, days.length]);
  
  const accommodationName = intake?.accommodation || trip.intake?.accommodation;

  const loadDocuments = () => {
    fetchTripDocuments(trip.id).then(docs => setTripDocuments(docs as DocumentInfo[]));
  };

  useEffect(() => {
    loadDocuments();
  }, [trip.id]);

  const localCurrencyRaw = essentials?.currency || '';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localSymbol === '£' || localCurrencyRaw.includes('GBP');
  const symbolSpacer = localSymbol.length > 1 ? ' ' : '';

  // ── FLAG LOGIC ──
  const targetCurrency = localCurrencyRaw.match(/[A-Z]{3}/)?.[0] || null;
  const currentFlag = displayCurrency === 'GBP' ? '🇬🇧' : getCurrencyFlag(targetCurrency);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (targetCurrency && targetCurrency !== 'GBP') {
      const cacheKey = `pear_fx_${targetCurrency}`;
      const timeKey = `pear_fx_time_${targetCurrency}`;
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      const cachedRate = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(timeKey);
      const currentTime = Date.now();

      if (cachedRate && cachedTime && (currentTime - parseInt(cachedTime, 10)) < ONE_DAY_MS) {
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
            localStorage.setItem(timeKey, currentTime.toString());
          }
        })
        .catch((err) => console.warn("Using fallback exchange rate.", err));
    } else if (targetCurrency === 'GBP') {
       setExchangeRate(1);
    }
  }, [targetCurrency, setExchangeRate]);

// Instantly load the DB image for new trips, fallback to Picsum temporarily for legacy trips
  const [heroImage, setHeroImage] = useState<string>(
    trip.intake?.heroImage || `https://picsum.photos/seed/${trip.id}/1600/900`
  );  
  useEffect(() => {
    if (!intake?.destinationPlaceId || typeof window === 'undefined') return;
    const googleObj = (window as any).google;
    
    if (googleObj?.maps?.places) {
      const dummyDiv = document.createElement('div');
      const service = new googleObj.maps.places.PlacesService(dummyDiv);
      
      // SMART FETCH: Always get the timezone offset. 
      // ONLY fetch photos if this is a legacy trip missing a DB image.
      const fieldsToFetch = ['utc_offset_minutes'];
      if (!trip.intake?.heroImage) {
        fieldsToFetch.push('photos');
      }

      service.getDetails({ placeId: intake.destinationPlaceId, fields: fieldsToFetch }, (place: any, status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK) {
          
          // 1. Always set the timezone for the clock widget
          if (place?.utc_offset_minutes !== undefined) {
             setDestinationUtcOffset(place.utc_offset_minutes);
          }
          
          // 2. Only swap the image if it's a legacy trip missing the DB image
          if (!trip.intake?.heroImage && place?.photos?.length > 0) {
            setHeroImage(place.photos[0].getUrl({ maxWidth: 1600, maxHeight: 900 }));
          }
        }
      });
    }
  }, [intake?.destinationPlaceId, trip.intake?.heroImage]);

  let localTimeStr = '--:--';
  let destTimeStr = '--:--';
  let isDestNight = false;

  if (now) {
    localTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (destinationUtcOffset !== null) {
      const absoluteUtcMs = now.getTime();
      const destLocalMs = absoluteUtcMs + (destinationUtcOffset * 60000);
      const destDate = new Date(destLocalMs);
      destTimeStr = destDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      const destHour = destDate.getUTCHours();
      isDestNight = destHour < 6 || destHour >= 18;
    }
  }

  const dynamicStays = days.reduce((acc: {name: string, startDay: number, placeId?: string, poiId: string}[], day) => {
    if (day.entries.length > 0) {
      const stayEntry = day.entries.find(e => {
        const isStayKeyword = e.type === 'ACCOMMODATION' || /(accommodation|hotel|airbnb|check-in|stay)/i.test(e.activityDescription || '') || /(accommodation|hotel|airbnb)/i.test(e.locationName || '');
        const isAirportOrStation = /(airport|flight|arrival|departure|station|terminal)/i.test(e.locationName + ' ' + e.activityDescription);
        return isStayKeyword && !isAirportOrStation;
      }) || day.entries.find(e => {
         return e.transitMethod === 'Start of Day' && !/(airport|flight|arrival|departure|station)/i.test(e.locationName + ' ' + e.activityDescription);
      });

      if (stayEntry) {
        const lastStay = acc[acc.length - 1];
        const isGeneric = /^(accommodation|hotel|airbnb|start of day)/i.test(stayEntry.locationName?.trim() || '');
        const displayName = (isGeneric && accommodationName) ? accommodationName : (stayEntry.locationName || 'Unknown Stay');

        if (!lastStay || lastStay.name !== displayName) {
          acc.push({
            name: displayName,
            startDay: day.dayNumber,
            placeId: stayEntry.placeId,
            poiId: stayEntry.id
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
      const isBookend = entry.type === 'ACCOMMODATION' || entry.transitMethod === 'Start of Day' || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.activityDescription || '') || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(entry.locationName || '');
      return !isBookend;
    });
    return total + (actualPlaces?.length || 0);
  }, 0);

  const dynamicTotalCost = days.reduce((sum, day) => 
    sum + day.entries.reduce((dSum, e) => dSum + (e.estimatedCostGBP || 0), 0)
  , 0);

  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const tapWater = essentials?.tapWater || 'Safe to drink 🚰';
  const apps = essentials?.apps && essentials.apps.length > 0 
    ? essentials.apps 
    : ['Bolt (Taxis)', 'TheFork (Dining)'];
  const risk = essentials?.contextualRisk || 'Pickpockets are common around major tourist hubs like the Metro. Keep valuables secure.';

  const leftCardStyle = "rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-6 md:p-8 shadow-sm flex flex-col";
  const rightCardStyle = "rounded-3xl bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-slate-700/50 p-6 md:p-8 shadow-sm flex flex-col backdrop-blur-md";

  return (
    <div className="w-full">
      <PrintOnlyBooklet trip={trip} itinerary={itinerary} formatCost={formatCost} localCurrencyRaw={localCurrencyRaw} totalStops={totalStops} />

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 relative print:hidden">

        {/* ── GLOBALS ── */}
        <FilingCabinet
          isOpen={isFilingCabinetOpen}
          onClose={() => setIsFilingCabinetOpen(false)}
          tripId={trip.id}
          availablePOIs={days.flatMap(d => d.entries.map(e => ({ id: e.id, name: e.locationName, dayName: `Day ${d.dayNumber}` })))}
          documents={tripDocuments}
          onUploadSuccess={loadDocuments}
        />

        <CollaboratorsModal 
          tripId={trip.id} 
          isOpen={isCollaboratorModalOpen} 
          onClose={() => setIsCollaboratorModalOpen(false)} 
        />

        <CalendarExportModal
          trip={trip}
          itinerary={itinerary}
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
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
          <img src={heroImage} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" />
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
                <p className="text-slate-200 text-lg font-medium drop-shadow-md flex items-center gap-3">
                  <span>{trip.startDate && trip.endDate ? `${format(new Date(trip.startDate), 'd MMM')} – ${format(new Date(trip.endDate), 'd MMM yyyy')}` : `${trip.duration} Days`}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>{totalStops} Planned Stops</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── HERO UTILITY TILES ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg leading-none">{weatherData ? getWeatherEmoji(weatherData[0].weatherCode) : '☀️'}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Forecast</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {weatherData ? `${weatherData[0].maxTemp}° / ${weatherData[0].minTemp}°` : '22° / 14°'}
            </span>
            <div className="mt-auto pt-3">
              <span className="text-[10px] font-medium text-slate-400">Local live conditions</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg leading-none">{isDestNight ? '🌙' : '☀️'}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Local Time</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{destTimeStr}</span>
            <div className="mt-auto pt-3">
              <span className="text-[10px] font-medium text-slate-400 truncate">{localTimeStr} at home</span>
            </div>
          </div>

          <button 
            onClick={toggleCurrency}
            className={`text-left rounded-2xl border p-4 transition-all flex flex-col h-full group cursor-pointer ${
              displayCurrency === 'LOCAL' 
                ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 shadow-inner' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl leading-none shadow-sm rounded-sm">{currentFlag}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {displayCurrency === 'GBP' ? 'Viewing in GBP' : 'Viewing in Local'}
              </span>
            </div>
            
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              £1 = {localSymbol}{exchangeRate.toFixed(2)}
            </span>
            
            <div className="mt-auto pt-3 flex items-center gap-1">
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">Tap to Toggle</span>
              <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">🔄</span>
            </div>
          </button>

          <button 
            onClick={() => router.push(`/itinerary/${trip.id}/ledger`)}
            className="text-left rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 p-4 shadow-lg hover:bg-slate-800 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col h-full group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-center gap-2 mb-2">
              <span className="text-lg leading-none">💳</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Budget</span>
            </div>
            <span className="relative z-10 text-xl font-black text-white tabular-nums tracking-tight">
              {formatCost(dynamicTotalCost)}
            </span>
            <div className="relative z-10 mt-auto pt-3 flex items-center gap-1">
              <span className="text-[10px] font-bold text-brand-400">Open Ledger</span>
              <span className="text-[10px] text-brand-400 transition-transform group-hover:translate-x-1">↗</span>
            </div>
          </button>

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
              className="pb-4 px-2 text-sm font-bold whitespace-nowrap text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2 group cursor-pointer"
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

        {/* ── MOBILE FLOATING PILL TOGGLE ── */}
        {typeof activeTab === 'number' && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] md:hidden shadow-2xl">
             <button 
               onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
               className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-6 py-3.5 flex items-center gap-2 font-bold text-sm tracking-wide shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.1)] transition-transform hover:scale-105 active:scale-95 border border-slate-700 dark:border-slate-200"
             >
               {viewMode === 'list' ? <>🗺️ View Map</> : <>📋 View Timeline</>}
             </button>
          </div>
        )}

        <div className="pb-20">
          
          {/* ── OVERVIEW CONTENT ── */}
          {essentials && (
            <div className={`flex-col gap-6 animate-fade-in ${activeTab === 'overview' ? 'flex' : 'hidden'}`}>

              {trip.intake?.transitDetails && ['Flight', 'Train'].includes(trip.intake.transitDetails.mode) && (
                <div className="relative w-full rounded-3xl bg-slate-900 dark:bg-slate-950 border border-slate-800 p-6 md:p-8 shadow-xl overflow-hidden flex flex-col md:flex-row gap-6 md:gap-0">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                  <div className="flex-1 md:pr-8 relative">
                     <div className="flex items-center gap-3 mb-4">
                       <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-300">
                         {trip.intake.transitDetails.mode === 'Flight' ? '🛫' : '🚆'}
                       </span>
                       <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Outbound</h3>
                     </div>
                     <div className="flex items-end gap-4 mb-2">
                       <div className="text-4xl font-black text-white">
                         {trip.intake.transitDetails.outbound?.time || 'TBD'}
                       </div>
                       {trip.intake.transitDetails.outbound?.reference && (
                         <div className="px-3 py-1 mb-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-brand-400">
                           {trip.intake.transitDetails.outbound.reference}
                         </div>
                       )}
                     </div>
                     <p className="text-sm font-medium text-slate-500">Arriving in {trip.destination}</p>
                  </div>

                  <div className="hidden md:flex flex-col items-center justify-center px-4 relative">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-900 dark:bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center z-10">
                        <span className="text-slate-500 text-xs">{trip.intake.transitDetails.mode === 'Flight' ? '✈️' : '🚂'}</span>
                     </div>
                     <div className="w-px h-full border-l-2 border-dashed border-slate-800" />
                  </div>
                  <div className="md:hidden w-full border-t-2 border-dashed border-slate-800 my-2 relative">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-slate-900 dark:bg-slate-950 z-10">
                        <span className="text-slate-500 text-xs">{trip.intake.transitDetails.mode === 'Flight' ? '✈️' : '🚂'}</span>
                     </div>
                  </div>

                  <div className="flex-1 md:pl-8 relative">
                     <div className="flex items-center gap-3 mb-4">
                       <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-300">
                         {trip.intake.transitDetails.mode === 'Flight' ? '🛬' : '🚆'}
                       </span>
                       <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Return</h3>
                     </div>
                     <div className="flex items-end gap-4 mb-2">
                       <div className="text-4xl font-black text-white">
                         {trip.intake.transitDetails.return?.time || 'TBD'}
                       </div>
                       {trip.intake.transitDetails.return?.reference && (
                         <div className="px-3 py-1 mb-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-brand-400">
                           {trip.intake.transitDetails.return.reference}
                         </div>
                       )}
                     </div>
                     <p className="text-sm font-medium text-slate-500">Departing from {trip.destination}</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 ${leftCardStyle} overflow-hidden`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-brand-500 dark:text-brand-400">🌤️</span> 
                      {trip.startDate ? `${days.length || trip.duration}-Day Outlook` : 'Climate & Best Time to Go'}
                    </h3>
                  </div>

                  {trip.startDate ? (
                    <div className="flex overflow-x-auto gap-3 pb-4 -mx-2 px-2 sm:mx-0 sm:px-0 hide-scrollbar snap-x">
                      {(weatherData || Array.from({ length: days.length || trip.duration })).map((dayData: any, i) => {
                        const tripDate = new Date(trip.startDate!);
                        tripDate.setDate(tripDate.getDate() + i);
                        const dayName = format(tripDate, 'EEE');
                        const dateString = format(tripDate, 'd MMM');
                        const isToday = format(tripDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                        const emoji = weatherData ? getWeatherEmoji(dayData.weatherCode) : ['☀️', '🌤️', '🌦️', '☀️', '⛅'][i % 5];
                        const maxT = weatherData ? `${dayData.maxTemp}°` : '22°';
                        const minT = weatherData ? `${dayData.minTemp}°` : '14°';

                        return (
                          <div 
                            key={i} 
                            className={`snap-start flex-shrink-0 min-w-[120px] flex flex-col items-center p-4 rounded-2xl border transition-colors ${
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
                              {emoji}
                            </span>
                            <div className="flex gap-2 font-bold tabular-nums">
                              <span className="text-sm text-slate-900 dark:text-white">{maxT}</span>
                              <span className="text-sm text-slate-400">{minT}</span>
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

                {/* ── NEW QUICK ACTIONS PANEL ── */}
                <div className={`${rightCardStyle} h-full justify-start overflow-hidden gap-4 flex flex-col`}>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Trip Actions</h3>

                  {/* 1. Print Button */}
                  <button onClick={() => window.print()} className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl flex items-center gap-4 transition-all text-left shadow-sm group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-lg group-hover:scale-110 transition-transform shadow-inner">
                      🖨️
                    </div>
                    <div>
                       <span className="block text-sm font-bold text-slate-900 dark:text-white">Print Booklet</span>
                       <span className="block text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Save as PDF</span>
                    </div>
                  </button>

                  {/* 2. Calendar Button */}
                  <button onClick={() => setIsCalendarModalOpen(true)} className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl flex items-center gap-4 transition-all text-left shadow-sm group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-lg group-hover:scale-110 transition-transform shadow-inner">
                      📅
                    </div>
                    <div>
                       <span className="block text-sm font-bold text-slate-900 dark:text-white">Export Calendar</span>
                       <span className="block text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Apple, Google, Outlook</span>
                    </div>
                  </button>

                  {/* 3. Manage Collaborators Button */}
                  <button onClick={() => setIsCollaboratorModalOpen(true)} className="w-full py-3 px-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl flex items-center gap-4 transition-all text-left shadow-sm group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-lg group-hover:scale-110 transition-transform shadow-sm">
                      🤝
                    </div>
                    <div>
                       <span className="block text-sm font-bold text-brand-900 dark:text-brand-100">Collaborators</span>
                       <span className="block text-[10px] text-brand-700 dark:text-brand-400 uppercase tracking-wide mt-0.5">Invite friends to edit</span>
                    </div>
                  </button>

                  {/* Spacer to push the currency toggle to the bottom */}
                  <div className="flex-1 min-h-[1rem]" />

                  {/* RESTORED: Master Currency Toggle */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50 w-full mt-auto">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exchange Rate</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">£1 = {localSymbol}{symbolSpacer}{exchangeRate.toFixed(2)}</span>
                    </div>
                    
                    {!isDomesticTrip && (
                      <button 
                        onClick={toggleCurrency} 
                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all rounded-xl text-xs font-black tracking-wide cursor-pointer shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>VIEW PRICES IN {displayCurrency === 'GBP' ? 'LOCAL' : 'GBP'}</span>
                        <span className="text-[14px] leading-none">{displayCurrency === 'GBP' ? currentFlag : '🇬🇧'}</span>
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
                        <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-normal break-words leading-tight">{tapWater}</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-xl shadow-sm">💳</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">Payments</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-normal break-words leading-tight">
                          Contactless is widely accepted. Carry small cash.
                        </p>
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
                    
                    <div className="flex flex-col gap-6">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Language</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-slate-900 dark:text-white">
                            {essentials?.language || 'Local Language'}
                          </span>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-lg border border-brand-200 dark:border-brand-800">
                             <span className="text-[10px] font-black uppercase tracking-wider">
                               English: {essentials?.englishProficiency || 'Moderate'}
                             </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Survival Phrases</h4>
                        <div className="flex flex-col gap-3">
                          {essentials?.usefulPhrases?.map((p, i) => (
                            <div key={i} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                              <span className="text-sm text-slate-600 dark:text-slate-400">{p.phrase}</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white text-right">{p.translation}</span>
                            </div>
                          )) || (
                            <div className="text-sm text-slate-500">No phrases loaded.</div>
                          )}
                        </div>
                      </div>

                    </div>
                    
                    <div className="flex flex-col justify-start gap-5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Local Customs</h4>
                        <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed">
                          {essentials?.localCustoms?.map((custom, i) => (
                            <li key={i}>{custom}</li>
                          )) || (
                            <li>Always greet shopkeepers when entering.</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Tipping & Custom</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {essentials?.tippingEtiquette || 'Tipping is generally appreciated but not strictly mandatory. 10% is standard for good service.'}
                        </p>
                      </div>
                      <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 mt-1">
                        <span className="text-base mt-0.5">🛡️</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Safety Advice</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{risk}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`${rightCardStyle} overflow-hidden flex flex-col`}>
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
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight" title={stay.name}>
                                    {stay.name}
                                  </span>
                                  <a 
                                    href={
                                      stay.placeId && stay.placeId !== "null" && stay.placeId !== ""
                                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name + ', ' + trip.destination)}&query_place_id=${stay.placeId}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name + ', ' + trip.destination)}`
                                    } 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    onClick={(e) => e.stopPropagation()} 
                                    className="relative z-10 inline-block cursor-pointer text-[10px] font-bold uppercase tracking-wider text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md transition-colors"
                                  >
                                    View Map ↗
                                  </a>
                                </div>
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
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-brand-500 dark:text-brand-400 tracking-widest block">✨ AI Matchmaker</span>
                          <span className="bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Tailored for you</span>
                        </div>
                        
                        <div className="flex flex-col mb-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                          {essentials?.neighbourhoodRecommendations && essentials.neighbourhoodRecommendations.length > 0 ? (
                            essentials.neighbourhoodRecommendations.map((rec, idx) => (
                              <div key={idx} className="py-3.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                                <div className="flex flex-col mb-1.5">
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.name + ' Hotels ' + trip.destination)}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-brand-600 dark:text-brand-400 mb-0.5 hover:underline flex items-center gap-1 group"
                                  >
                                    {rec.name} 
                                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                  </a>
                                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{rec.vibe}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {rec.reason}
                                </p>
                              </div>
                            ))
                          ) : (
                             <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-2">
                               Based on your selected activities, staying centrally minimises travel time and keeps you close to transit hubs.
                             </p>
                          )}
                        </div>

                        <div className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-800/60">
                          <button 
                            onClick={() => {
                              if (onEditRequest) onEditRequest();
                              else setActiveTab(1);
                            }}
                            className="w-full mt-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
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

          {/* ── DAY VIEWS ── */}
          {days.map(activeDay => {
            const isActiveTab = activeTab === activeDay.dayNumber;
            const mapUrl = generateGoogleMapsDayUrl(activeDay.entries, trip.destination);
            
            return (
              <div key={activeDay.dayNumber} className={`${isActiveTab ? 'flex' : 'hidden'} flex-col lg:flex-row gap-8 lg:gap-12 animate-fade-in`}>
                <div className="flex-1">
                  
                  {viewMode === 'list' || typeof window === 'undefined' ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
                            <span className="text-lg font-black text-white">{activeDay.dayNumber}</span>
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Day {activeDay.dayNumber} Schedule</h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              {activeDay.entries?.length || 0} stops planned for today.
                            </p>
                          </div>
                        </div>
                        
                        {mapUrl && (
                          <a 
                            href={mapUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                            Open Route in Maps
                          </a>
                        )}
                      </div>

                      <div className="flex flex-col">
                        {(activeDay.entries || []).map((entry, index, arr) => (
                          <TimelineEntry
                            key={`${entry.id}-${entry.time}`}
                            entry={entry}
                            nextEntry={arr[index + 1]}
                            isLast={index === arr.length - 1}
                            dayNumber={activeDay.dayNumber}
                            accommodationName={accommodationName}
                            onPlaceClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })}
                            formatCost={formatCost}
                            destination={trip.destination}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[65vh] min-h-[500px] w-full rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-lg relative">
                       <DayMap 
                         entries={activeDay.entries || []} 
                         destination={trip.destination} 
                         onMarkerClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })}
                       />
                       <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">Day {activeDay.dayNumber} Map</h3>
                       </div>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-80 flex-shrink-0">
                  <div className="sticky top-28 flex flex-col gap-4">
                    
                    <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-2 border border-slate-200 dark:border-slate-700/50 shadow-inner">
                      <button 
                        onClick={() => setViewMode('list')} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Timeline
                      </button>
                      <button 
                        onClick={() => setViewMode('map')} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Interactive Map
                      </button>
                    </div>
                    
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Day {activeDay.dayNumber} Spend</h3>
                        <button 
                          onClick={() => router.push(`/itinerary/${trip.id}/ledger`)} 
                          className="text-[10px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Log Spend ↗
                        </button>
                      </div>
                      
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <span className={`text-3xl font-black block ${(activeDay.estimatedDailySpendGBP || 0) > (trip.budgetGBP / trip.duration) ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                            {formatCost(activeDay.estimatedDailySpendGBP || 0)}
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
                          className={`h-full rounded-full transition-all duration-1000 ${(activeDay.estimatedDailySpendGBP || 0) > (trip.budgetGBP / trip.duration) ? 'bg-red-500' : 'bg-brand-500'}`} 
                          style={{ width: `${Math.min((((activeDay.estimatedDailySpendGBP || 0) / (trip.budgetGBP / trip.duration)) * 100) || 0, 100)}%` }} 
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#0f172a]/40 p-5 backdrop-blur-sm shadow-sm flex flex-col gap-6">
                      
                      <div>
                        {(() => {
                          const currentDayNum = activeDay.dayNumber;
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
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white">{formatCost(dynamicTotalCost)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${dynamicTotalCost > trip.budgetGBP ? 'bg-red-500' : 'bg-brand-500'}`}
                            style={{ width: `${Math.min((dynamicTotalCost / trip.budgetGBP) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 italic">
                          {dynamicTotalCost > trip.budgetGBP 
                            ? "Plan is currently over total budget." 
                            : `Plan uses ${Math.round((dynamicTotalCost / trip.budgetGBP) * 100)}% of total budget.`}
                        </p>
                      </div>
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