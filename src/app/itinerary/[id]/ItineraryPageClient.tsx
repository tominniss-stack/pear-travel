'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import SortableItinerary from '@/components/itinerary/SortableItinerary';
import ItineraryDisplay from '@/components/itinerary/ItineraryDisplay';
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

export default function ItineraryPageClient({ dbTrip, dbItinerary }: ItineraryPageClientProps) {
  const setItinerary = useTripStore((state) => state.setItinerary);
  const setIntake = useTripStore((state) => state.setIntake); 
  const setCurrentTripId = useTripStore((state) => state.setCurrentTripId);
  const itinerary = useTripStore((state) => state.itinerary);
  
  // ── PHASE 8: THEME ROUTER STATE ──
  const aestheticPreference = useTripStore((state) => state.aestheticPreference);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // ── THE DESYNC FIX: Sync server state to Zustand immediately ──
    setItinerary(dbItinerary);
    setIntake(dbTrip.intake); 
    setCurrentTripId(dbTrip.id);
  }, [dbItinerary, dbTrip, setItinerary, setIntake, setCurrentTripId]);

  const handleSaveItinerary = async () => {
    if (!itinerary || isSaving) return;

    setIsSaving(true);
    try {
      // FIX: Changed from /api/itinerary/ to /api/trip/ to hit the correct V3 JSON handler
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

  return (
    <div className="w-full py-8">
      <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <span aria-hidden="true" className="mr-2">←</span>
          Back to My Trips
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (isEditing) handleSaveItinerary();
              else setIsEditing(true);
            }}
            disabled={isSaving}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              isEditing 
                ? 'bg-brand-500 text-white hover:bg-brand-400 border border-brand-400' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Trip Planner'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <SortableItinerary />
      ) : (
        /* ── PHASE 8: DYNAMIC COMPONENT SWAPPING ── */
        aestheticPreference === 'EDITORIAL' ? (
          <ItineraryDisplayV2 
            itinerary={currentItinerary} 
            trip={dbTrip} 
            onEditRequest={() => setIsEditing(true)} 
          />
        ) : (
          /* Default Fallback is Classic V1 */
          <ItineraryDisplay 
            itinerary={currentItinerary} 
            trip={dbTrip} 
            onEditRequest={() => setIsEditing(true)} 
          />
        )
      )}
    </div>
  );
}