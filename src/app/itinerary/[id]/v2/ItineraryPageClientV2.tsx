// src/app/itinerary/[id]/v2/ItineraryPageClientV2.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Make sure you created this file in src/components/itinerary/
import ItineraryDisplayV2 from '@/components/itinerary/ItineraryDisplayV2'; 
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

  useEffect(() => {
    setItinerary(dbItinerary);
    setIntake(dbTrip.intake); 
    setCurrentTripId(dbTrip.id);
  }, [dbItinerary, dbTrip, setItinerary, setIntake, setCurrentTripId]);

  const currentItinerary = itinerary || dbItinerary;

  return (
    <div className="w-full py-8">
      <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link
          href={`/itinerary/${dbTrip.id}`}
          className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span aria-hidden="true" className="mr-2">←</span>
          Back to Live V1 Route
        </Link>
        <span className="text-xs font-black uppercase tracking-widest text-brand-500 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          🧪 UX PLAYGROUND
        </span>

        <div className="flex items-center gap-3">
          {/* Editing disabled in V2 Sandbox to protect live DB data */}
          <button
            disabled
            className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all opacity-60 cursor-not-allowed bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700"
          >
            Editing Disabled in V2
          </button>
        </div>
      </div>

      <ItineraryDisplayV2 
        itinerary={currentItinerary} 
        trip={dbTrip} 
      />
    </div>
  );
}