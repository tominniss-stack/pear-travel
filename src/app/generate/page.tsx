'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHydratedTripStore } from '@/store/tripStore';
import { useProfileStore } from '@/store/profileStore';

const LOADING_MESSAGES = [
  'Analysing transit routes…',
  'Clustering nearby attractions…',
  'Checking opening hours…',
  'Booking theoretical tables…',
  'Calculating the scenic route…',
  'Consulting the locals…',
  'Avoiding the tourist traps…',
  'Sourcing the best coffee stops…',
  'Optimising your daily budget…',
  'Finalising your perfect trip…',
];

export default function GeneratePage() {
  const router = useRouter();
  
  // Hydration-safe store reads
  const intake  = useHydratedTripStore((state) => state.intake);
  const allPOIs = useHydratedTripStore((state) => state.allPOIs);

  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const hasFetchedRef = useRef(false);

  // ── Loading Animation ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // ── API Call & DB Save ──────────────────────────────────────────────────────
  useEffect(() => {
    if (intake === undefined || hasFetchedRef.current) return;
    
    if (!intake.destination) {
      router.replace('/');
      return;
    }

    const generateItinerary = async () => {
      hasFetchedRef.current = true;
      const selectedPOIs = (allPOIs ?? []).filter((poi) => poi.isFavourited);

      // Extract the travel profile snapshot from the store at call-time
      const { dailyPacing, transportPreference, diningStyle, idealStartTime } =
        useProfileStore.getState();
      const travelProfile = { dailyPacing, transportPreference, diningStyle, idealStartTime };

      try {
        const response = await fetch('/api/itinerary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intake, selectedPOIs, travelProfile }),
        });

        // ── THE FIX: Extract the REAL error from the backend ──
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server Error ${response.status}: Failed to generate trip.`);
        }

        const data = await response.json();
        
        if (!data.tripId) {
          throw new Error('Failed to save trip to database.');
        }

        // Push to 100% just before redirecting for a smooth visual finish
        setProgress(100);
        
        // Wait a tiny fraction of a second so the user sees 100%, then redirect
        setTimeout(() => {
          router.replace(`/itinerary/${data.tripId}`);
        }, 400);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    };

    generateItinerary();
  }, [intake, allPOIs, router]);

  // ── Render: Error State ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <span className="text-4xl" aria-hidden="true">😕</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Generation Failed</h1>
          {/* Now displaying the REAL error message here: */}
          <p className="mt-3 text-sm font-medium leading-relaxed text-red-600 max-w-sm mx-auto bg-red-50 p-4 rounded-xl border border-red-100">
            {error}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-xs tracking-widest uppercase font-black text-white shadow-md transition-all hover:bg-brand-700 hover:-translate-y-0.5"
          >
            GO BACK & TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Loading State (Waiting for Hydration or API) ────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-10" />
          <span className="absolute inline-flex h-20 w-20 animate-pulse rounded-full bg-brand-100 opacity-60" />
          <span className="relative text-5xl" aria-hidden="true">🌍</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Building Your <span className="text-brand-600 dark:text-brand-400">{intake?.destination || 'Trip'}</span> Itinerary
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Our AI travel planner is crafting your perfect trip.<br />
          This usually takes 10–20 seconds.
        </p>

        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 h-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-all duration-500">
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}