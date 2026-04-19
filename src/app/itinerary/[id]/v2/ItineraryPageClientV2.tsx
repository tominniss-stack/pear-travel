'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Import the Terminal Theme
import ItineraryDisplayTerminal from '@/components/itinerary/ItineraryDisplayTerminal';
import ItineraryDisplayNotebook from '@/components/itinerary/ItineraryDisplayNotebook';

import type { Itinerary, TripIntake } from '@/types';
import { useTripStore } from '@/store/tripStore';
import { useHydratedProfileStore } from '@/store/profileStore';
import { parseBriefingSemantics } from '@/lib/briefingParser';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake: TripIntake; 
}

interface ItineraryPageClientProps {
  dbTrip: ClientTripProps;
  dbItinerary: Itinerary;
}

export default function ItineraryPageClientV2({ dbTrip, dbItinerary }: ItineraryPageClientProps) {
  const router = useRouter();
  const setItinerary = useTripStore((state) => state.setItinerary);
  const setIntake = useTripStore((state) => state.setIntake);
  const setCurrentTripId = useTripStore((state) => state.setCurrentTripId);
  const itinerary = useTripStore((state) => state.itinerary);

  const [isMounted, setIsMounted] = useState(false);
  const [isFilingCabinetOpen, setIsFilingCabinetOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Calculate missing ThemeProps
  const briefing = useMemo(() => parseBriefingSemantics(itinerary?.essentials), [itinerary?.essentials]);
  
  const baseCurrencyCode = useHydratedProfileStore((s) => s.baseCurrency) || 'GBP';
  const [baseExchangeRate, setBaseExchangeRate] = useState(1);

  // Fetch exchange rate from GBP to baseCurrencyCode
  useEffect(() => {
    if (baseCurrencyCode === 'GBP') {
      setBaseExchangeRate(1);
      return;
    }
    fetch(`https://api.frankfurter.app/latest?from=GBP&to=${baseCurrencyCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.rates && data.rates[baseCurrencyCode]) {
          setBaseExchangeRate(data.rates[baseCurrencyCode]);
        }
      })
      .catch((err) => console.warn('Failed to fetch base exchange rate:', err));
  }, [baseCurrencyCode]);

  const totalCostBase = useMemo(() => {
    const costGBP = itinerary?.days?.reduce((sum, day) => sum + day.entries.reduce((dSum, e) => dSum + (e.estimatedCostGBP || 0), 0), 0) || 0;
    return costGBP * baseExchangeRate;
  }, [itinerary, baseExchangeRate]);
  
  const basecamps = useMemo(() => {
    if (!itinerary?.days) return [];
    const stays: {name: string, startDay: number}[] = [];
    itinerary.days.forEach(day => {
      const hasAcc = day.entries.some(e => e.type === 'ACCOMMODATION' || e.locationName.toLowerCase().includes('hotel'));
      if (hasAcc || day.dayNumber === 1) {
        stays.push({ name: dbTrip.intake?.accommodation || 'Basecamp', startDay: day.dayNumber });
      }
    });
    return stays;
  }, [itinerary, dbTrip.intake?.accommodation]);

  useEffect(() => {
    setIsMounted(true);
    setItinerary(dbItinerary);
    setIntake(dbTrip.intake); 
    setCurrentTripId(dbTrip.id);
  }, [dbItinerary, dbTrip, setItinerary, setIntake, setCurrentTripId]);

  const currentItinerary = itinerary || dbItinerary;

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 w-full animate-pulse" />;
  }

  return (
    <div className="w-full py-8">
      <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link
          href={`/itinerary/${dbTrip.id}`}
          className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <span aria-hidden="true" className="mr-2">←</span>
          Back to Live Router
        </Link>
        <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
          🧪 THEME SANDBOX
        </span>

        <div className="flex items-center gap-3">
          <button
            disabled
            className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all opacity-60 cursor-not-allowed bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700"
          >
            Saving Disabled in Sandbox
          </button>
        </div>
      </div>

      {/* RENDER THE TERMINAL THEME HERE */}
      <ItineraryDisplayTerminal
        itinerary={currentItinerary}
        trip={dbTrip}
        briefing={briefing}
        totalCostBase={totalCostBase} baseCurrencyCode={baseCurrencyCode}
        basecamps={basecamps}
        onOpenLedger={() => router.push(`/itinerary/${dbTrip.id}/ledger`)}
        onOpenDocs={() => setIsFilingCabinetOpen(true)}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
        onEditTrip={() => { /* V2 handles edit locally */ }}
      />
    </div>
  );
}