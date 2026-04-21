'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import Link from 'next/link';
import type { Itinerary, DayItinerary, ItineraryEntry, TransitMethod } from '@/types';
import PlaceDetailsModal, { DocumentInfo } from './PlaceDetailsModal';
import FilingCabinet from './FilingCabinet';
import DayMap from './DayMap';
import CollaboratorsModal from './CollaboratorsModal';
import CalendarExportModal from './CalendarExportModal';
import { useTripStore } from '@/store/tripStore';
import { fetchTripDocuments } from '@/app/actions/documents';
import { checkIfVenueIsClosed } from '@/lib/time/openingHours';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake?: {
    accommodation?: string;
    heroImage?: string;
    destinationPlaceId?: string;
    transitDetails?: {
      mode: string;
      outbound?: {
        time?: string;
        reference?: string;
      };
      return?: {
        time?: string;
        reference?: string;
      };
    };
  };
}

function parseTimeToMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
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
     return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(validEntries[0].locationName + ', ' + destinationCity)}${placeIdParam}`;
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
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const phrases = essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 ? essentials.usefulPhrases : [];
  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const tapWater = essentials?.tapWater || 'Safe to drink';
  const risk = essentials?.contextualRisk || 'Stay alert around major tourist hubs.';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';

  const [baseUrl, setBaseUrl] = useState('https://peartravel.app');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const masterQrUrl = `${baseUrl}/itinerary/${trip.id}`;

  return (
    <div className="hidden print:block w-full bg-white text-black font-sans print:m-0 print:p-0">
      <div className="print:page-break-after-always pb-8">
        <div className="mb-8 border-b-2 border-black pb-6 flex justify-between items-start">
          <div className="flex-1 pr-6">
            <p className="text-sm font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-1">Your Travel Booklet</p>
            <h1 className="text-6xl font-serif mb-3 tracking-tight">{trip.destination}</h1>
            <p className="text-xl font-medium text-slate-700 flex items-center gap-2 font-mono uppercase tracking-widest text-xs">
              {trip.startDate && trip.endDate ? `${format(new Date(trip.startDate), 'do MMMM')} — ${format(new Date(trip.endDate), 'do MMMM yyyy')}` : `${trip.duration} Days`}
              <span>·</span> {totalStops} Stops <span>·</span> Est. Budget: {formatCost(trip.budgetGBP)}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 border-2 border-slate-200 rounded-xl shrink-0 w-32 bg-white">
            <div style={{ width: '90px', height: '90px', backgroundColor: 'white' }}>
              <QRCode value={masterQrUrl} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 256 256`} level="M" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-black/50 dark:text-white/50 mt-2 text-center leading-tight">
              Scan for<br/>Digital Trip
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-8">
          <div>
            <h3 className="text-xl font-serif border-b border-black/20 pb-2 mb-4">Logistics</h3>
            <ul className="text-base space-y-3 font-sans">
              <li><strong className="text-black/50 dark:text-white/50 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Currency</strong> {localCurrencyRaw} ({localSymbol})</li>
              <li><strong className="text-black/50 dark:text-white/50 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Power Outlets</strong> {plugType}</li>
              <li><strong className="text-black/50 dark:text-white/50 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Tap Water</strong> {tapWater}</li>
              <li><strong className="text-black/50 dark:text-white/50 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Safety & Risk</strong> {risk}</li>
              {essentials?.airportTransit && (
                <li><strong className="text-black/50 dark:text-white/50 uppercase font-mono tracking-wider text-[10px] block mb-0.5">Airport Transit</strong> {essentials.airportTransit}</li>
              )}
            </ul>
          </div>
          <div>
            {phrases.length > 0 && (
              <>
                <h3 className="text-xl font-serif border-b border-black/20 pb-2 mb-4">Survival Phrases</h3>
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
            {(essentials?.englishProficiency || phrases.length === 0) && (
              <div className={phrases.length > 0 ? "mt-4 pt-4 border-t border-slate-100" : ""}>
                 <h3 className={phrases.length === 0 ? "text-xl font-serif border-b border-black/20 pb-2 mb-4" : "hidden"}>Communication</h3>
                 <strong className="text-black/50 dark:text-white/50 uppercase font-mono tracking-wider text-[10px] block mb-0.5">English Proficiency</strong>
                 <p className="font-sans">{essentials?.englishProficiency || 'Moderate'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {days.map(day => {
        const dayMapUrl = generateGoogleMapsDayUrl(day.entries, trip.destination);
        return (
          <div key={day.dayNumber} className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
              <h2 className="text-3xl font-serif text-black">Day {day.dayNumber}</h2>
              {dayMapUrl && (
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-black/50 dark:text-white/50 text-right leading-tight">
                    Scan for<br/>Day Route
                  </span>
                  <div className="border border-slate-200 p-1.5 rounded-lg bg-white" style={{ width: '60px', height: '60px' }}>
                    <QRCode value={dayMapUrl} size={128} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 256 256`} level="L" />
                  </div>
                </div>
              )}
            </div>
            <table className="w-full text-base font-sans">
              <tbody>
                {day.entries.map((entry, idx) => (
                  <tr key={idx} className="border-b border-slate-200" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="w-[15%] py-5 align-top font-bold text-xl tabular-nums font-mono">{entry.time || '—'}</td>
                    <td className="w-[65%] py-5 pr-6 align-top">
                      <div className="font-serif text-xl text-black mb-1">{entry.locationName}</div>
                      <div className="text-slate-700 leading-relaxed text-sm">{entry.activityDescription?.replace(/^\[.*?\]\s*/, '')}</div>
                      {entry.transitNote && (
                        <div className="mt-3 text-[10px] font-bold text-black/50 dark:text-white/50 uppercase font-mono tracking-widest flex items-center gap-1">
                          <span>↳ Transit:</span> <span className="text-black">{entry.transitMethod} ({entry.transitNote})</span>
                        </div>
                      )}
                    </td>
                    <td className="w-[20%] py-5 align-top text-right font-bold whitespace-nowrap text-lg font-mono">{formatCost(entry.estimatedCostGBP)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline Entry ───────────────────────────────────────
function TimelineEntry({
  entry, nextEntry, isLast, isOdd, dayNumber, accommodationName, destination, onPlaceClick, formatCost
}: {
  entry: ItineraryEntry; nextEntry?: ItineraryEntry; isLast: boolean; isOdd: boolean; dayNumber: number; accommodationName?: string; destination: string; onPlaceClick: (placeId: string, poiId: string) => void; formatCost: (cost?: number) => string;
}) {
  const tripStartDate = useTripStore((state) => state.intake?.startDate);
  const allPOIs = useTripStore((state) => state.allPOIs);

  const isClosedClash = useMemo(() => {
    if (!entry.time) return false;

    let descriptions = entry.openingHours?.weekdayDescriptions;
    if (!descriptions && entry.placeId) {
      const matchingPOI = allPOIs.find((p) => p.placeId === entry.placeId);
      descriptions = matchingPOI?.openingHours?.weekdayDescriptions;
    }

    if (!descriptions) return false;

    const visitDate = tripStartDate
      ? new Date(new Date(tripStartDate).getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000)
      : new Date();

    return checkIfVenueIsClosed(visitDate, entry.time, descriptions);
  }, [entry.time, entry.openingHours, entry.placeId, allPOIs, dayNumber, tripStartDate]);

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
  
  return (
    <div className="flex flex-col border-t border-black/20 dark:border-white/20">
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* TIME COLUMN */}
        <div className="w-full sm:w-32 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-black/20 dark:border-white/20 pt-4 pb-2 sm:py-6 pr-6">
          <span className={`text-4xl md:text-5xl italic font-serif block sm:text-right ${isClosedClash ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
            {entry.time ? entry.time.replace(/^0/, '') : '—'}
          </span>
          {isClosedClash && (
            <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider flex items-center gap-1 mt-2 sm:justify-end">
              ⚠ Closed
            </span>
          )}
        </div>
        
        {/* CONTENT COLUMN */}
        <div onClick={() => hasPlaceId && onPlaceClick(entry.placeId!, entry.id)} className={`flex-1 py-4 sm:py-6 group ${hasPlaceId ? 'cursor-pointer' : 'cursor-default'} ${isOdd ? 'sm:pl-16 md:pl-32' : 'sm:pl-6 md:pl-12'}`}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 w-full group-hover:px-2 transition-all">
            <div className="min-w-0 w-full sm:w-auto flex-shrink-0">
              <div className="flex items-center gap-4 flex-wrap mb-2 sm:mb-3">
                <h4 className={`text-2xl sm:text-3xl md:text-4xl font-serif leading-none transition-colors ${hasPlaceId ? 'text-black dark:text-white group-hover:italic' : 'text-black dark:text-white'}`}>{displayTitle}</h4>
              </div>
            </div>
            
            {/* Desktop Dot Leader */}
            {!isBookend && <div className="dot-leader hidden sm:block flex-grow min-w-[40px] h-2 mb-2 md:mb-3 opacity-50 group-hover:opacity-100 transition-opacity mx-4"></div>}
            
            {/* Cost Block - Structural Stack on Mobile */}
            {!isBookend && (
              <div className="flex sm:block justify-between items-end sm:flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-black/20 dark:border-white/20 sm:border-0">
                <span className="sm:hidden text-[9px] font-mono tracking-[0.4em] uppercase text-black/60 dark:text-white/60 font-medium">Est. Cost</span>
                <span className="text-xl font-serif tracking-tight text-black dark:text-white sm:mb-1">{formatCost(entry.estimatedCostGBP)}</span>
              </div>
            )}
          </div>
          <p className="text-base md:text-lg leading-[1.6] text-black/70 dark:text-white/70 font-sans max-w-2xl mt-4 group-hover:px-2 transition-all">{displayDesc}</p>

          {/* BRUTALIST TRANSIT PILL */}
          {!isLast && nextEntry && nextEntry.transitNote && (
             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/20/50 w-max">
               <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(displayTitle + ', ' + destination)}&destination=${encodeURIComponent(nextEntry.locationName + ', ' + destination)}&travelmode=${getGoogleMapsTravelMode(nextEntry.transitMethod)}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all`} title={`Get directions to ${nextEntry.locationName}`}>
                 <span className="border border-slate-400 dark:border-slate-600 px-2.5 py-1">
                   {nextEntry.transitMethod.replace('Taxi / Rideshare', 'Taxi').toUpperCase()}
                 </span>
                 <span className="tracking-widest">— {nextEntry.transitNote}</span>
               </a>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component (V2 Premium) ───────────────────────────────────────────────────────
export default function ItineraryDisplayV2({ itinerary, trip, totalCostBase, baseCurrencyCode, onEditRequest }: { itinerary: Itinerary; trip: ClientTripProps; totalCostBase: number; baseCurrencyCode: string; onEditRequest?: () => void; }) {
  const days = itinerary.days ?? [];
  const essentials = itinerary.essentials;
  const [activeTab, setActiveTab] = useState<'overview' | number>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [isFilingCabinetOpen, setIsFilingCabinetOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);

  const { exchangeRate, setExchangeRate, displayCurrency, toggleCurrency, intake } = useTripStore();

  useEffect(() => { setViewMode('list'); }, [activeTab]);

  const accommodationName = intake?.accommodation || trip.intake?.accommodation;

  const loadDocuments = useCallback(() => {
    fetchTripDocuments(trip.id).then(docs => setTripDocuments(docs as DocumentInfo[]));
  }, [trip.id]);
  
  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const localCurrencyRaw = essentials?.currency || '';
  const localSymbol = localCurrencyRaw.split(' ')[0] || '€';
  const isDomesticTrip = localSymbol === '£' || localCurrencyRaw.includes('GBP');
  const symbolSpacer = localSymbol.length > 1 ? ' ' : '';

  // ── Pseudo-random template selector ──
  const briefingTemplateIndex = useMemo(() => {
    if (!trip.id) return 0;
    return trip.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3;
  }, [trip.id]);

  const [heroImage, setHeroImage] = useState<string>(`https://picsum.photos/seed/${trip.id}/1200/600`);
  
  useEffect(() => {
    if (!intake?.destinationPlaceId || typeof window === 'undefined') return;
    const googleObj = (window as any).google;
    if (googleObj?.maps?.places) {
      const service = new googleObj.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({ placeId: intake.destinationPlaceId, fields: ['photos', 'utc_offset_minutes'] }, (place: any, status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK) {
          if (place?.photos?.length > 0) setHeroImage(place.photos[0].getUrl({ maxWidth: 1200, maxHeight: 600 }));
        }
      });
    }
  }, [intake?.destinationPlaceId]);

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
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: baseCurrencyCode, maximumFractionDigits: 0 }).format(cost);
  };

  const totalStops = days.reduce((total, day) => total + (day.entries?.filter(e => !(e.type === 'ACCOMMODATION' || e.transitMethod === 'Start of Day' || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(e.activityDescription || '') || /(Accommodation|Hotel|Airbnb|Start of Day|Return to|Airport|Flight)/i.test(e.locationName || ''))).length || 0), 0);
  const plugType = essentials?.plugType || 'Type C / F (230V)';
  const tapWater = essentials?.tapWater || 'Safe to drink';
  const apps = essentials?.apps && essentials.apps.length > 0 ? essentials.apps : ['Uber', 'Google Maps'];
  const risk = essentials?.contextualRisk || 'Stay alert in crowds.';

  const renderEditorialBriefing = () => {
    // Future-proof: Use AI-generated prose if available in the DB
    if ('editorialBriefing' in trip && typeof trip.editorialBriefing === 'string' && trip.editorialBriefing.trim() !== '') {
      return (
        <div className="font-serif text-lg md:text-xl lg:text-2xl leading-relaxed text-black dark:text-white columns-1 md:columns-2 gap-12 text-justify">
          <p className="first-letter:text-7xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-line:uppercase first-line:tracking-widest">
            {trip.editorialBriefing}
          </p>
        </div>
      );
    }

    const transitText = essentials?.airportTransit.toLowerCase().includes('uber') || essentials?.airportTransit.toLowerCase().includes('taxi') ? 'taxis and rideshares' : 'the local transit system';
    const englishText = essentials?.englishProficiency?.toLowerCase() || 'moderate';
    const tippingText = essentials?.tippingEtiquette?.toLowerCase() || 'tip around 10%';
    const tippingCap = tippingText.charAt(0).toUpperCase() + tippingText.slice(1);
    const waterText = tapWater.toLowerCase().includes('safe') ? 'perfectly safe to drink' : 'best avoided in favour of bottled';

    const templates = [
      (
        <div className="font-serif text-xl md:text-2xl leading-[1.8] text-slate-900 dark:text-slate-100 md:columns-2 gap-12 lg:gap-20 text-justify">
          <p className="break-inside-avoid mb-8">
            <span className="float-left font-serif text-[7.5rem] md:text-[9rem] leading-[0.7] pr-4 pt-3 pb-2 text-slate-900 dark:text-white">
              Y
            </span>
            our time in <strong className="font-black tracking-wide uppercase">{trip.destination}</strong> will be shaped by how you move. Expect to rely on <span className="italic text-slate-700 dark:text-slate-300">{transitText}</span> to get between neighbourhoods. English is spoken at a <span className="italic text-slate-700 dark:text-slate-300">{englishText}</span> level, making navigation manageable, though a few local phrases go a long way.
          </p>
          <p className="break-inside-avoid mb-8">
            When settling the bill for food or services, the standard practice is to <span className="italic text-slate-700 dark:text-slate-300">{tippingText}</span>. For daily hydration and basics, keep in mind that the tap water is <span className="italic text-slate-700 dark:text-slate-300">{waterText}</span>. Keep these details in mind, and the city will open up to you.
          </p>
        </div>
      ),
      (
        <div className="font-serif text-xl md:text-2xl leading-[1.8] text-slate-900 dark:text-slate-100 md:columns-2 gap-12 lg:gap-20 text-justify">
          <p className="break-inside-avoid mb-8">
            <span className="float-left font-serif text-[7.5rem] md:text-[9rem] leading-[0.7] pr-4 pt-3 pb-2 text-slate-900 dark:text-white">
              G
            </span>
            etting the most out of <strong className="font-black tracking-wide uppercase">{trip.destination}</strong> requires a bit of practical groundwork. You will be using <span className="italic text-slate-700 dark:text-slate-300">{transitText}</span> as your primary way around the city. Communication shouldn't be a major barrier—English proficiency is <span className="italic text-slate-700 dark:text-slate-300">{englishText}</span>—but local etiquette still applies.
          </p>
          <p className="break-inside-avoid mb-8">
            <span className="italic text-slate-700 dark:text-slate-300">{tippingCap}</span> when dining out to show appreciation for good service. Finally, a quick note on the essentials: the tap water here is <span className="italic text-slate-700 dark:text-slate-300">{waterText}</span>. Use this briefing as your baseline for the days ahead.
          </p>
        </div>
      ),
      (
        <div className="font-serif text-xl md:text-2xl leading-[1.8] text-slate-900 dark:text-slate-100 md:columns-2 gap-12 lg:gap-20 text-justify">
          <p className="break-inside-avoid mb-8">
            <span className="float-left font-serif text-[7.5rem] md:text-[9rem] leading-[0.7] pr-4 pt-3 pb-2 text-slate-900 dark:text-white">
              L
            </span>
            ogistics dictate the flow of any trip to <strong className="font-black tracking-wide uppercase">{trip.destination}</strong>. The city is best tackled using <span className="italic text-slate-700 dark:text-slate-300">{transitText}</span>. You will find the general English proficiency to be <span className="italic text-slate-700 dark:text-slate-300">{englishText}</span>, meaning your phrasebook will be a useful fallback for daily interactions.
          </p>
          <p className="break-inside-avoid mb-8">
            Hospitality norms here suggest you <span className="italic text-slate-700 dark:text-slate-300">{tippingText}</span>. As for the absolute basics to keep you going, the tap water is <span className="italic text-slate-700 dark:text-slate-300">{waterText}</span>. Get comfortable with these ground rules before stepping out.
          </p>
        </div>
      )
    ];

    return templates[briefingTemplateIndex];
  };

  return (
    <div className="w-full font-sans print:m-0 print:p-0 bg-[#FAF9F6] dark:bg-slate-950 dark:text-slate-100 min-h-screen transition-colors duration-300">
      
      {/* ── PRINT BOOKLET ── */}
      <PrintOnlyBooklet trip={trip} itinerary={itinerary} formatCost={formatCost} localCurrencyRaw={localCurrencyRaw} totalStops={totalStops} />

      <div className="print:hidden">
        {/* Modals */}
        <FilingCabinet isOpen={isFilingCabinetOpen} onClose={() => setIsFilingCabinetOpen(false)} tripId={trip.id} availablePOIs={days.flatMap(d => d.entries.map(e => ({ id: e.id, name: e.locationName, dayName: `Day ${d.dayNumber}` })))} documents={tripDocuments} onUploadSuccess={loadDocuments} />
        {selectedPOI && <PlaceDetailsModal placeId={selectedPOI.placeId} poiId={selectedPOI.poiId} tripId={trip.id} tripDocuments={tripDocuments} onClose={() => setSelectedPOI(null)} onDocumentUpdate={loadDocuments} />}
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

        {/* ── THE PASSEPARTOUT HERO ── */}
        <div className="px-4 md:px-8 lg:px-12 pt-8 md:pt-12 w-full max-w-7xl mx-auto mb-16 md:mb-20 lg:mb-24">
          <header className="mb-12 text-center border-b border-black dark:border-white pb-8 animate-fade-in">
            <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-black/50 dark:text-white/50 mb-6 flex justify-center items-center gap-4">
              <span>Vol. I</span>
              <span className="w-1 h-1 rounded-full bg-black/30 dark:bg-white/30" />
              <span>The Curated Guide</span>
              <span className="w-1 h-1 rounded-full bg-black/30 dark:bg-white/30" />
              <span>{trip.destination}</span>
            </p>
          </header>
          <div className="relative w-full h-[60vh] min-h-[500px]">
            <img src={heroImage} alt={trip.destination} className="w-full h-full object-cover grayscale opacity-90 dark:opacity-60 border border-slate-200 dark:border-white/20 shadow-sm" />
            
            {/* The Text Bleed */}
            <div className="absolute -bottom-16 md:-bottom-24 left-4 md:left-12 z-10 pointer-events-none w-full max-w-4xl">
              <h1 className="text-[6rem] sm:text-[9rem] md:text-[12rem] lg:text-[14rem] font-serif text-slate-900 dark:text-white tracking-tighter leading-[0.75] m-0 drop-shadow-xl md:drop-shadow-none break-words">
                {trip.destination}
              </h1>
            </div>
          </div>
        </div>

        {/* Spacer for the overlapping text to breathe */}
        <div className="h-16 md:h-24 w-full" />

        <div className="max-w-5xl mx-auto w-full px-6 flex flex-wrap items-center gap-6 border-t-2 border-slate-900 dark:border-white pt-6 text-slate-900 dark:text-white font-mono text-[10px] md:text-xs uppercase tracking-[0.2em]">
          <span>{trip.startDate && trip.endDate ? `${format(new Date(trip.startDate), 'do MMMM')} — ${format(new Date(trip.endDate), 'do MMMM yyyy')}` : `${trip.duration} Days`}</span>
          <span className="w-1 h-1 bg-brand-500 rounded-full" />
          <span>{days.length} Days</span>
          <span className="w-1 h-1 bg-brand-500 rounded-full" />
          <span>{totalStops} Stops</span>
        </div>

        <div className="max-w-5xl mx-auto w-full px-6 relative mt-16">
          
          {/* ── NAVIGATION & ACTION BAR ── */}
          <div className="w-full border-b border-black dark:border-white pb-4 mb-16 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 xl:gap-0">
            
            {/* Left: The Itinerary Tabs */}
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
              <button
                onClick={() => {
                  setActiveTab('overview');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-[10px] font-mono tracking-[0.2em] uppercase transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'text-black dark:text-white font-bold'
                    : 'text-black/70 dark:text-white/70 font-medium'
                }`}
              >
                The Guide
              </button>
              {days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => {
                    setActiveTab(day.dayNumber);
                    document.getElementById(`day-${day.dayNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`text-[10px] font-mono tracking-[0.2em] uppercase transition-colors whitespace-nowrap ${
                    activeTab === day.dayNumber
                      ? 'text-black dark:text-white font-bold'
                      : 'text-black/70 dark:text-white/70 font-medium'
                  }`}
                >
                  Day {day.dayNumber}
                </button>
              ))}
            </div>

            {/* Right: The Editorial Action Bar */}
            <div className="flex items-center gap-4 md:gap-6 overflow-x-auto hide-scrollbar w-full xl:w-auto pt-2 xl:pt-0">
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className="text-[10px] font-mono tracking-[0.2em] uppercase text-black/60 dark:text-white/60 font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                Export Calendar
              </button>

              <button
                onClick={() => setIsCollaboratorModalOpen(true)}
                className="text-[10px] font-mono tracking-[0.2em] uppercase text-black/60 dark:text-white/60 font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                Share Trip
              </button>

              <button
                onClick={() => window.print()}
                className="hidden md:block text-[10px] font-mono tracking-[0.2em] uppercase text-black/60 dark:text-white/60 font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                Print Guide
              </button>

              {/* Divider */}
              <span
                className="hidden md:block w-px h-3 bg-black/30 dark:bg-white/30"
                aria-hidden="true"
              />

              {/* Primary Action */}
              <button
                onClick={() => {
                  if (onEditRequest) onEditRequest();
                }}
                className="text-[10px] font-mono tracking-[0.2em] uppercase text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors whitespace-nowrap cursor-pointer"
              >
                Edit Itinerary
              </button>
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
                
                <div className="flex flex-col gap-16 max-w-4xl mx-auto pt-4 md:pt-12">
                  
                  {/* 1. THE EDITORIAL BRIEFING (Dynamic Templates) */}
                  <div>
                    {renderEditorialBriefing()}

                    <div className="mt-12 flex flex-wrap gap-x-16 gap-y-10 border-t-2 border-slate-900 dark:border-white pt-10">
                      <div className="min-w-[140px]">
                        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-3">Power Supply</h4>
                        <p className="font-serif text-xl text-slate-900 dark:text-white italic">{plugType}</p>
                      </div>
                      <div className="min-w-[140px] flex-1 max-w-sm">
                        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-3">Risk Assessment</h4>
                        <p className="font-serif text-xl text-slate-900 dark:text-white italic leading-snug">{risk}</p>
                      </div>
                      <div className="min-w-[140px]">
                        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-3">Essential Apps</h4>
                        <p className="font-serif text-xl text-slate-900 dark:text-white italic">{apps.join(', ')}</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. THE AIRMAIL TRANSIT TICKET */}
                  {trip.intake?.transitDetails && ['Flight', 'Train'].includes(trip.intake.transitDetails.mode) && (
                    <div>
                      <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-6 flex justify-between items-end border-b border-black/20 dark:border-white/20 pb-2">
                        <span>Transit Documents</span>
                        <span className="text-slate-900 dark:text-white">{trip.intake.transitDetails.mode}</span>
                      </h2>
                      
                      <div className="w-full border-2 border-slate-900 dark:border-white bg-white dark:bg-slate-900 p-8 flex flex-col md:flex-row justify-between gap-12 relative shadow-[8px_8px_0px_rgba(0,0,0,0.1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.1)]">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_15px,transparent_15px,transparent_30px,#3b82f6_30px,#3b82f6_45px,transparent_45px,transparent_60px)] opacity-80" />
                        
                        <div className="flex-1 mt-4">
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-4">Outbound</p>
                          <div className="text-6xl font-serif text-slate-900 dark:text-white mb-2">{trip.intake.transitDetails.outbound?.time || 'TBD'}</div>
                          <div className="text-sm font-sans text-black/50 dark:text-white/50 mb-8 italic">Arrive {trip.destination}</div>
                          <div className="font-mono text-xs uppercase tracking-widest text-slate-900 dark:text-white border-t border-black/20 dark:border-slate-700 pt-4">
                            Ref // <span className="font-bold">{trip.intake.transitDetails.outbound?.reference || 'PENDING'}</span>
                          </div>
                        </div>

                        <div className="hidden md:block w-px bg-slate-300 dark:bg-slate-700" />
                        <div className="md:hidden h-px w-full bg-slate-300 dark:bg-slate-700" />

                        <div className="flex-1 mt-4">
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-4">Return</p>
                          <div className="text-6xl font-serif text-slate-900 dark:text-white mb-2">{trip.intake.transitDetails.return?.time || 'TBD'}</div>
                          <div className="text-sm font-sans text-black/50 dark:text-white/50 mb-8 italic">Depart {trip.destination}</div>
                          <div className="font-mono text-xs uppercase tracking-widest text-slate-900 dark:text-white border-t border-black/20 dark:border-slate-700 pt-4">
                            Ref // <span className="font-bold">{trip.intake.transitDetails.return?.reference || 'PENDING'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {/* 3. THE RESIDENCE */}
                    <div>
                      <div className="flex items-end justify-between border-b border-black/20 dark:border-white/20 pb-2 mb-8">
                        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50">The Residence</h2>
                        <button onClick={() => { if (onEditRequest) onEditRequest(); else setActiveTab(1); }} className="text-[9px] font-mono uppercase tracking-widest text-slate-900 dark:text-white hover:text-brand-600 transition-colors">
                          Manage ↗
                        </button>
                      </div>
                      
                      {dynamicStays.length > 0 ? (
                        <div className="flex flex-col gap-10">
                          {dynamicStays.map((stay, idx) => {
                            const hasPlaceId = !!(stay.placeId && stay.placeId !== "null" && stay.placeId !== "");
                            const mapsUrl = hasPlaceId ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name + ', ' + trip.destination)}&query_place_id=${stay.placeId}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name + ', ' + trip.destination)}`;

                            return (
                              <div key={idx} className="group cursor-pointer" onClick={() => hasPlaceId && setSelectedPOI({ placeId: stay.placeId!, poiId: stay.poiId })}>
                                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-3">Check-in Day {stay.startDay}</p>
                                <h3 className="text-3xl font-serif text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mb-4 leading-tight">{stay.name}</h3>
                                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-block text-[9px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50 border border-black/20 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors">
                                  Map ↗
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-lg font-serif italic text-black/50 dark:text-white/50">No accommodation scheduled yet.</p>
                      )}
                    </div>

                    {/* 4. THE PHRASEBOOK */}
                    {essentials?.usefulPhrases && essentials.usefulPhrases.length > 0 && (
                      <div>
                        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-8 border-b border-black/20 dark:border-white/20 pb-2">The Phrasebook</h2>
                        <div className="columns-1 md:columns-2 gap-12">
                          {essentials.usefulPhrases.slice(0,6).map((p, i) => (
                            <div key={i} className="mb-6 break-inside-avoid">
                              <span className="font-black font-sans text-xs uppercase tracking-widest text-slate-900 dark:text-white mr-3">{p.phrase}.</span>
                              <span className="font-serif text-xl text-slate-600 dark:text-slate-400 italic">{p.translation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. THE TREASURY (Ledger) */}
                  <div className="border-t border-slate-900 dark:border-white pt-12 mt-8">
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span>The Treasury</span>
                      <div className="flex items-center gap-6">
                        <button onClick={toggleCurrency} className="text-slate-900 dark:text-white hover:text-brand-600 transition-colors">
                          {displayCurrency === 'GBP' ? 'View Local' : 'View GBP'}
                        </button>
                        <Link 
                          href={`/itinerary/${trip.id}/ledger`} 
                          className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-6 py-2.5 hover:bg-brand-600 transition-colors font-mono tracking-widest text-[10px] uppercase"
                        >
                          Open Ledger ↗
                        </Link>
                      </div>
                    </h2>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-12">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50 mb-4">Estimated Exposure</p>
                        <div className="text-7xl font-serif text-slate-900 dark:text-white leading-none mb-6 flex items-start">
                          <span className="text-3xl mt-2 mr-1">{displayCurrency === 'GBP' ? '£' : localSymbol}</span>
                          <span>{formatCost(totalCostBase).replace(/^[^\d\s]+\s*/, '')}</span>
                        </div>
                        <p className="text-sm font-serif italic text-black/50 dark:text-white/50">
                          of your {formatCost(trip.budgetGBP)} initial budget
                        </p>
                      </div>

                      <div className="w-full md:w-auto text-left md:text-right">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-4">Current Exchange</p>
                        <div className="text-3xl font-serif text-slate-900 dark:text-white mb-2">1 {baseCurrencyCode} = {localSymbol}{exchangeRate.toFixed(2)}</div>
                        <p className="text-xs font-mono uppercase tracking-widest text-black/50 dark:text-white/50">{localCurrencyRaw}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── THE DOSSIER (FLIGHTS & LODGING) ── */}
                  <div className="mt-16 md:mt-24 pt-12 border-t border-black dark:border-white">
                    <h2 className="font-mono text-[10px] tracking-[0.4em] uppercase text-black/60 dark:text-white/60 font-medium mb-12 text-center">
                      Logistics & Accommodations
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
                      
                      {/* Departures / Flights */}
                      <div>
                        <h3 className="font-serif text-3xl mb-6 text-black dark:text-white">Transit</h3>
                        <div className="border-l border-black/20 dark:border-white/20 pl-6 space-y-6">
                          <div>
                            <p className="font-mono text-[9px] tracking-widest uppercase text-black/60 dark:text-white/60 font-medium mb-1">Outbound Flight</p>
                            <p className="font-serif text-xl text-black dark:text-white italic opacity-50">Not yet specified.</p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] tracking-widest uppercase text-black/60 dark:text-white/60 font-medium mb-1">Return Flight</p>
                            <p className="font-serif text-xl text-black dark:text-white italic opacity-50">Not yet specified.</p>
                          </div>
                        </div>
                      </div>

                      {/* Accommodations */}
                      <div>
                        <h3 className="font-serif text-3xl mb-6 text-black dark:text-white">Lodging</h3>
                        <div className="border-l border-black/20 dark:border-white/20 pl-6 space-y-6">
                          <div>
                            <p className="font-mono text-[9px] tracking-widest uppercase text-black/60 dark:text-white/60 font-medium mb-1">Primary Residence</p>
                            {trip.intake?.accommodation ? (
                              <p className="font-serif text-xl text-black dark:text-white italic">{trip.intake.accommodation}</p>
                            ) : (
                              <p className="font-serif text-xl text-black dark:text-white italic opacity-50">Not yet specified.</p>
                            )}
                          </div>
                        </div>
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
                <div key={activeDay.dayNumber} className={`${isActiveTab ? 'flex' : 'hidden'} flex-col lg:flex-row gap-12 lg:gap-24 animate-fade-in max-w-6xl mx-auto pt-8 md:pt-16`}>
                  
                  <div className="flex-1">
                    {viewMode === 'list' || typeof window === 'undefined' ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16 border-b-2 border-slate-900 dark:border-white pb-8">
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-4">Schedule</p>
                            <h2 className="text-6xl font-serif text-slate-900 dark:text-white">Day {activeDay.dayNumber}</h2>
                          </div>
                          {mapUrl && (
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-max items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border border-slate-900 dark:border-white px-5 py-2.5 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors">
                              Route Map ↗
                            </a>
                          )}
                        </div>
                        
                        <div className="flex flex-col">
                          {(activeDay.entries || []).map((entry, index, arr) => (
                            <TimelineEntry key={`${entry.id}-${entry.time}`} entry={entry} nextEntry={arr[index + 1]} isLast={index === arr.length - 1} isOdd={index % 2 !== 0} dayNumber={activeDay.dayNumber} accommodationName={accommodationName} onPlaceClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })} formatCost={formatCost} destination={trip.destination} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-[65vh] min-h-[600px] w-full border border-black/20 dark:border-white/20 relative">
                         <DayMap entries={activeDay.entries || []} destination={trip.destination} onMarkerClick={(placeId, poiId) => setSelectedPOI({ placeId, poiId })} />
                      </div>
                    )}
                  </div>

                  <div className="w-full lg:w-72 flex-shrink-0">
                    <div className="sticky top-40 flex flex-col gap-16">
                      
                      <div className="flex flex-col gap-4">
                        <button onClick={() => setViewMode('list')} className={`text-left pb-2 text-[10px] font-mono uppercase tracking-[0.2em] border-b transition-all ${viewMode === 'list' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-black/20 dark:border-white/20 text-slate-400 hover:text-slate-600'}`}>
                          Read Timeline
                        </button>
                        <button onClick={() => setViewMode('map')} className={`text-left pb-2 text-[10px] font-mono uppercase tracking-[0.2em] border-b transition-all ${viewMode === 'map' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-black/20 dark:border-white/20 text-slate-400 hover:text-slate-600'}`}>
                          Live Routing Map
                        </button>
                      </div>
                      
                      <div>
                        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-6 pb-2 border-b border-black/20 dark:border-white/20 flex justify-between">
                          <span>Day {activeDay.dayNumber} Spend</span>
                          {!isDomesticTrip && <button onClick={toggleCurrency} className="text-slate-900 dark:text-white hover:text-brand-600">{displayCurrency === 'GBP' ? 'LOCAL' : 'GBP'}</button>}
                        </h3>
                        
                        <div className={`text-5xl font-serif leading-none mb-3 ${(activeDay.estimatedDailySpendGBP || 0) > (trip.budgetGBP / trip.duration) ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                          {formatCost(activeDay.estimatedDailySpendGBP || 0)}
                        </div>
                        <div className="text-sm font-serif italic text-black/50 dark:text-white/50 mb-8">
                          of {formatCost(trip.budgetGBP / trip.duration)} limit
                        </div>

                        {/* Cumulative Spend Tracker */}
                        {(() => {
                          const currentDayNum = activeDay.dayNumber;
                          const spendToDate = days.filter(d => d.dayNumber <= currentDayNum).reduce((sum, d) => sum + (d.estimatedDailySpendGBP || 0), 0);
                          return (
                            <div className="border-l border-black/20 dark:border-white/20 pl-4">
                              <p className="text-[9px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">Spend to Date</p>
                              <p className="text-2xl font-serif text-slate-900 dark:text-white">{formatCost(spendToDate)}</p>
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
    </div>
  );
}