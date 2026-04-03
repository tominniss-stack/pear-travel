'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Import the Terminal Theme
import ItineraryDisplayTerminal from '@/components/itinerary/ItineraryDisplayTerminal';

import type { Itinerary, TripIntake } from '@/types'; 
import { useTripStore } from '@/store/tripStore';

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
  const setItinerary = useTripStore((state) => state.setItinerary);
  const setIntake = useTripStore((state) => state.setIntake); 
  const setCurrentTripId = useTripStore((state) => state.setCurrentTripId);
  const itinerary = useTripStore((state) => state.itinerary);

  const [isMounted, setIsMounted] = useState(false);

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
      />
    </div>
  );
}