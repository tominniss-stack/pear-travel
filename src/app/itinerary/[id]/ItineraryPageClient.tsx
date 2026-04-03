'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import SortableItinerary from '@/components/itinerary/SortableItinerary';
import ItineraryDisplay from '@/components/itinerary/ItineraryDisplay';
import ItineraryDisplayV2 from '@/components/itinerary/ItineraryDisplayV2';
import ItineraryDisplayNotebook from '@/components/itinerary/ItineraryDisplayNotebook';
import ItineraryDisplayTerminal from '@/components/itinerary/ItineraryDisplayTerminal';
import ThemeInjector from '@/components/layout/ThemeInjector';
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
  
  const aestheticPreference = useTripStore((state) => state.aestheticPreference);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setItinerary(dbItinerary);
    setIntake(dbTrip.intake); 
    setCurrentTripId(dbTrip.id);
  }, [dbItinerary, dbTrip, setItinerary, setIntake, setCurrentTripId]);

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

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 w-full animate-pulse" />;
  }

  return (
    <div className="w-full py-8 relative">
      <ThemeInjector />

      {/* ── DYNAMIC HEADER BAR ── */}
      {isEditing ? (
        // STATE 1: EDITING MODE (Abort vs Save)
        <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center text-sm font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            <span aria-hidden="true" className="mr-2">✕</span>
            Abort Changes
          </button>

          <button
            type="button"
            onClick={handleSaveItinerary}
            disabled={isSaving}
            className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-brand-500 text-white hover:bg-brand-400 border border-brand-400"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      ) : (
        // STATE 2: VIEWING MODE (Hide entirely for Terminal so it stays immersive)
        aestheticPreference !== 'TERMINAL' && (
          <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <span aria-hidden="true" className="mr-2">←</span>
              Back to My Trips
            </Link>

            {/* Hide the standard Edit button for Notebook since it provides its own native UI tab */}
            {aestheticPreference !== 'NOTEBOOK' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
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
        aestheticPreference === 'TERMINAL' ? (
          <ItineraryDisplayTerminal
            itinerary={currentItinerary} 
            trip={dbTrip} 
            onEditAction={() => setIsEditing(true)} 
          />
        ) : aestheticPreference === 'NOTEBOOK' ? (
          <ItineraryDisplayNotebook
            itinerary={currentItinerary} 
            trip={dbTrip} 
            onEditAction={() => setIsEditing(true)} 
          />
        ) : aestheticPreference === 'EDITORIAL' ? (
          <ItineraryDisplayV2 
            itinerary={currentItinerary} 
            trip={dbTrip} 
            onEditRequest={() => setIsEditing(true)} 
          />
        ) : (
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