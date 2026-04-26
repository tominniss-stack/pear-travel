'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

function ItineraryThemeLoadingSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-4 pt-6" aria-hidden="true">
      <span className="sr-only">Loading theme...</span>
      <div className="h-72 w-full rounded-3xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" 
               style={{ animationDelay: `${i * 75}ms` }} />
        ))}
      </div>
      <div className="h-12 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-96 w-full rounded-3xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

import SortableItinerary from '@/components/itinerary/SortableItinerary';

const ItineraryDisplay = dynamic(
  () => import('@/components/itinerary/ItineraryDisplay'),
  { ssr: false, loading: () => <ItineraryThemeLoadingSkeleton /> }
);
const ItineraryDisplayEditorial = dynamic(
  () => import('@/components/itinerary/ItineraryDisplayEditorial'),
  { ssr: false, loading: () => <ItineraryThemeLoadingSkeleton /> }
);
const ItineraryDisplayNotebook = dynamic(
  () => import('@/components/itinerary/ItineraryDisplayNotebook'),
  { ssr: false, loading: () => <ItineraryThemeLoadingSkeleton /> }
);
const ItineraryDisplayTerminal = dynamic(
  () => import('@/components/itinerary/ItineraryDisplayTerminal'),
  { ssr: false, loading: () => <ItineraryThemeLoadingSkeleton /> }
);

export const preloadThemes = {
  editorial: () => import('@/components/itinerary/ItineraryDisplayEditorial'),
  default:   () => import('@/components/itinerary/ItineraryDisplay'),
  notebook:  () => import('@/components/itinerary/ItineraryDisplayNotebook'),
  terminal:  () => import('@/components/itinerary/ItineraryDisplayTerminal'),
};

import CalendarExportModal from '@/components/itinerary/CalendarExportModal';
import FilingCabinet from '@/components/itinerary/FilingCabinet';
import ThemeInjector from '@/components/layout/ThemeInjector';
import type { Itinerary, TripIntake, ClientBooking } from '@/types';
import type { DocumentInfo } from '@/components/itinerary/PlaceDetailsModal';
import { useTripStore } from '@/store/tripStore';
import { useHydratedProfileStore } from '@/store/profileStore';
import { useUIStore } from '@/store/uiStore';
import { parseBriefingSemantics } from '@/lib/briefingParser';
import { fetchTripDocuments } from '@/app/actions/documents';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake: TripIntake;
  bookings: ClientBooking[];
  themeOverride?: 'CLASSIC' | 'EDITORIAL' | 'NOTEBOOK' | 'TERMINAL' | null;
  terminalColor?: string | null;
}

interface ItineraryPageClientProps {
  dbTrip: ClientTripProps;
  dbItinerary: Itinerary;
}

export default function ItineraryPageClient({ dbTrip, dbItinerary }: ItineraryPageClientProps) {
  const router = useRouter();

  // ── Trip Store ──────────────────────────────────────────────────────────────
  const setItinerary = useTripStore((state) => state.setItinerary);
  const setIntake = useTripStore((state) => state.setIntake);
  const setCurrentTripId = useTripStore((state) => state.setCurrentTripId);
  const setBookings = useTripStore((state) => state.setBookings);
  const setThemeOverride = useTripStore((state) => state.setThemeOverride);
  const setTerminalColor = useTripStore((state) => state.setTerminalColor);
  const itinerary = useTripStore((state) => state.itinerary);
  const aestheticPreference = useTripStore((state) => state.aestheticPreference);
  const activeTheme = useTripStore((state) => state.themeOverride) || 'CLASSIC';

  // ── UI Store ────────────────────────────────────────────────────────────────
  const activeModal = useUIStore((s) => s.activeModal);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);

  // ── Local State ─────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);

  // ── Hydration ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    setItinerary(dbItinerary);
    setIntake(dbTrip.intake);
    setCurrentTripId(dbTrip.id);
    setBookings(dbTrip.bookings);
  }, [dbItinerary, dbTrip, setItinerary, setIntake, setCurrentTripId, setBookings]);

  useEffect(() => {
    console.log("HYDRATING FROM SERVER:", dbTrip?.themeOverride);
    if (dbTrip?.themeOverride) {
      setThemeOverride(dbTrip.themeOverride);
    } else {
      setThemeOverride('CLASSIC');
    }
    setTerminalColor(dbTrip?.terminalColor || 'GREEN');
  }, [dbTrip?.id, dbTrip?.themeOverride, dbTrip?.terminalColor, setThemeOverride, setTerminalColor]);

  // ── Document Loader ─────────────────────────────────────────────────────────
  const loadDocuments = useCallback(() => {
    if (dbTrip?.id) {
      fetchTripDocuments(dbTrip.id).then((docs) =>
        setTripDocuments(docs as DocumentInfo[]),
      );
    }
  }, [dbTrip?.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ── Semantic Engine ─────────────────────────────────────────────────────────
  const briefing = useMemo(
    () => parseBriefingSemantics(itinerary?.essentials),
    [itinerary?.essentials],
  );

  // ── Derived Data (calculated once in Brain, passed to all themes) ──────────
  const baseCurrencyCode = useHydratedProfileStore((s) => s.baseCurrency) || 'GBP';

  const totalCostBase = useMemo(
    () => itinerary?.days?.reduce((sum, day) => sum + day.entries.reduce((dSum, e) => dSum + (e.estimatedCostGBP || 0), 0), 0) || 0,
    [itinerary],
  );

  const basecamps = useMemo(() => {
    if (!itinerary?.days) return [];
    const accommodationName = dbTrip.intake?.accommodation;
    return itinerary.days.reduce((acc: { name: string; startDay: number }[], day) => {
      if (day.entries.length > 0) {
        const stayEntry =
          day.entries.find(e =>
            (e.type === 'ACCOMMODATION' ||
              /(accommodation|hotel|airbnb|check-in|stay)/i.test(e.activityDescription || '') ||
              /(accommodation|hotel|airbnb)/i.test(e.locationName || '')) &&
            !/(airport|flight|arrival|departure|station|terminal)/i.test(e.locationName + ' ' + e.activityDescription)
          ) ||
          day.entries.find(e =>
            e.transitMethod === 'Start of Day' &&
            !/(airport|flight|arrival|departure|station)/i.test(e.locationName + ' ' + e.activityDescription)
          );
        if (stayEntry) {
          const lastStay = acc[acc.length - 1];
          const isGeneric = /^(accommodation|hotel|airbnb|start of day)/i.test(stayEntry.locationName?.trim() || '');
          const displayName = isGeneric && accommodationName ? accommodationName : stayEntry.locationName || 'Unknown Stay';
          if (!lastStay || lastStay.name !== displayName) {
            acc.push({ name: displayName, startDay: day.dayNumber });
          }
        }
      }
      return acc;
    }, []);
  }, [itinerary, dbTrip.intake?.accommodation]);

  // ── ThemeProps Callbacks ────────────────────────────────────────────────────
  const { setExchangeRate, setDisplayCurrency } = useTripStore();
  const localCurrencyRaw = itinerary?.essentials?.currency || '';
  const targetCurrency = localCurrencyRaw.match(/[A-Z]{3}/)?.[0] || null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (targetCurrency && targetCurrency !== baseCurrencyCode) {
      const cacheKey = `pear_fx_${baseCurrencyCode}_${targetCurrency}`;
      const timeKey = `pear_fx_time_${baseCurrencyCode}_${targetCurrency}`;
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      const cachedRate = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(timeKey);
      const currentTime = Date.now();

      if (cachedRate && cachedTime && (currentTime - parseInt(cachedTime, 10)) < ONE_DAY_MS) {
        setExchangeRate(parseFloat(cachedRate));
        return;
      }

      fetch(`https://api.frankfurter.app/latest?from=${baseCurrencyCode}&to=${targetCurrency}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.rates && data.rates[targetCurrency]) {
            const newRate = data.rates[targetCurrency];
            setExchangeRate(newRate);
            localStorage.setItem(cacheKey, newRate.toString());
            localStorage.setItem(timeKey, currentTime.toString());
          }
        })
        .catch((err) => {
          console.warn('[FX] Exchange rate fetch failed, reverting to GBP', err);
          setDisplayCurrency('GBP');
        });
    } else if (targetCurrency === baseCurrencyCode) {
       setExchangeRate(1);
    }
  }, [targetCurrency, baseCurrencyCode, setExchangeRate, setDisplayCurrency]);
  const handleOpenLedger = useCallback(() => {
    router.push(`/itinerary/${dbTrip.id}/ledger`);
  }, [router, dbTrip.id]);

  const handleOpenDocs = useCallback(() => {
    openModal('docs');
  }, [openModal]);

  const handleOpenCalendar = useCallback(() => {
    openModal('calendar');
  }, [openModal]);

  const handleEditTrip = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSaveItinerary = async () => {
    if (!itinerary || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/trip/${dbTrip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itinerary }),
      });

      if (!response.ok) throw new Error(`Failed to save: ${response.statusText}`);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving itinerary:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentItinerary = itinerary || dbItinerary;

  // ── POI reference list for FilingCabinet ────────────────────────────────────
  const availablePOIs = useMemo(
    () =>
      currentItinerary?.days?.flatMap((d) =>
        d.entries.map((e) => ({
          id: e.id,
          name: e.locationName,
          dayName: `Day ${d.dayNumber}`,
        })),
      ) ?? [],
    [currentItinerary],
  );

  const getThemeBackground = () => {
    switch (activeTheme) {
      case 'TERMINAL': return 'bg-[#0D0D0D]';
      case 'NOTEBOOK': return 'bg-[#FDFBF7] dark:bg-[#1a1a1a]';
      case 'EDITORIAL': return 'bg-[#FAF9F6] dark:bg-[#0a0a0a]';
      case 'CLASSIC':
      default: return 'bg-zinc-50 dark:bg-zinc-900/50';
    }
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 w-full animate-pulse" />;
  }

  return (
    <div className={`w-full min-h-screen pt-8 relative ${getThemeBackground()}`}>
      <ThemeInjector />

      {/* ── DYNAMIC HEADER BAR ── */}
      {isEditing ? (
        // STATE 1: EDITING MODE (Abort vs Save)
        <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            <span aria-hidden="true" className="mr-2">✕</span>
            Abort Changes
          </button>

          <button
            type="button"
            onClick={handleSaveItinerary}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-medium transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      ) : (
        // STATE 2: VIEWING MODE (Hide entirely for Terminal so it stays immersive)
        activeTheme !== 'TERMINAL' && (
          <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <span aria-hidden="true" className="mr-2">←</span>
              Back to My Trips
            </Link>

            {/* Hide the standard Edit button for Notebook since it provides its own native UI tab */}
            {activeTheme !== 'NOTEBOOK' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-6 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium transition-colors"
                >
                  Edit Trip Planner
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* ── THEME ENGINE ROUTING ── */}
      {isEditing ? (
        <SortableItinerary />
      ) : (
        activeTheme === 'TERMINAL' ? (
          /* Phase 3 will migrate ItineraryDisplayTerminal to ThemeProps */
          (() => {
            const C = ItineraryDisplayTerminal as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} totalCostBase={totalCostBase} baseCurrencyCode={baseCurrencyCode} basecamps={basecamps} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditAction={handleEditTrip} />;
          })()
        ) : activeTheme === 'NOTEBOOK' ? (
          /* Phase 3 will migrate ItineraryDisplayNotebook to ThemeProps */
          (() => {
            const C = ItineraryDisplayNotebook as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} totalCostBase={totalCostBase} baseCurrencyCode={baseCurrencyCode} basecamps={basecamps} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditAction={handleEditTrip} />;
          })()
        ) : activeTheme === 'EDITORIAL' ? (
          /* Phase 3 will migrate ItineraryDisplayEditorial to ThemeProps */
          (() => {
            const C = ItineraryDisplayEditorial as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} totalCostBase={totalCostBase} baseCurrencyCode={baseCurrencyCode} basecamps={basecamps} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditRequest={handleEditTrip} />;
          })()
        ) : (
          /* Phase 3 will migrate ItineraryDisplay to ThemeProps */
          (() => {
            const C = ItineraryDisplay as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} totalCostBase={totalCostBase} baseCurrencyCode={baseCurrencyCode} basecamps={basecamps} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditRequest={handleEditTrip} />;
          })()
        )
      )}

      {/* ── ROOT-LEVEL MODALS (owned by the Brain, not by themes) ── */}
      <FilingCabinet
        isOpen={activeModal === 'docs'}
        onClose={closeModal}
        tripId={dbTrip.id}
        availablePOIs={availablePOIs}
        documents={tripDocuments}
        onUploadSuccess={loadDocuments}
      />
      <CalendarExportModal
        isOpen={activeModal === 'calendar'}
        onClose={closeModal}
        itinerary={currentItinerary}
        trip={dbTrip}
      />
    </div>
  );
}