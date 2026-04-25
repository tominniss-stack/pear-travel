'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/store/tripStore';
import type { POI } from '@/types';

function formatCost(costGBP: number): string {
  if (costGBP === 0) return 'Free';
  return `£${costGBP.toLocaleString('en-GB')}`;
}

function calcTotalCost(pois: POI[]): number {
  return pois.reduce((sum, poi) => sum + poi.estimatedCostGBP, 0);
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <span className="text-2xl" aria-hidden="true">🗺️</span>
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No places added yet</p>
        <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">Tap the heart on any card to add it to your trip.</p>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'Museum':             '🏛️',
    'Art Gallery':        '🎨',
    'Place of Worship':   '⛪',
    'Cathedral':          '⛪',
    'Park & Gardens':     '🌿',
    'Zoo':                '🦁',
    'Amusement Park':     '🎡',
    'Aquarium':           '🐠',
    'Stadium':            '🏟️',
    'Cinema':             '🎬',
    'Nightlife':          '🌙',
    'Bar':                '🍸',
    'Restaurant':         '🍽️',
    'Café':               '☕',
    'Shopping':           '🛍️',
    'Market':             '🏪',
    'Tourist Attraction': '📸',
    'Nature':             '🌲',
    'Library':            '📚',
    'Historic Site':      '🗿',
    'Spa & Wellness':     '🧖',
  };
  return map[category] ?? '📍';
}

interface StagedPOIRowProps {
  poi: POI;
  onRemove: (placeId: string) => void;
}

function StagedPOIRow({ poi, onRemove }: StagedPOIRowProps) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 text-base">
        {getCategoryEmoji(poi.category)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200 leading-snug">{poi.name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatCost(poi.estimatedCostGBP)}
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600" aria-hidden="true">·</span>
          {poi.avgDurationMinutes < 60 ? `${poi.avgDurationMinutes}min` : `${Math.floor(poi.avgDurationMinutes / 60)}h${poi.avgDurationMinutes % 60 > 0 ? ` ${poi.avgDurationMinutes % 60}min` : ''}`}
        </p>
      </div>
      <button type="button" onClick={() => onRemove(poi.placeId)} aria-label={`Remove ${poi.name} from trip`} className="flex-shrink-0 rounded-lg p-1 text-zinc-300 dark:text-zinc-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}

interface StagingAreaProps {
  tripId: string;
}

export default function StagingArea({ tripId }: StagingAreaProps) {
  const router         = useRouter();
  
  // ── STORE SELECTORS ──
  const toggleFavourite         = useTripStore((state) => state.toggleFavourite);
  const allPOIs                 = useTripStore((state) => state.allPOIs);
  const itinerary               = useTripStore((state) => state.itinerary);
  const pushStagedToItinerary   = useTripStore((state) => state.pushStagedToItinerary);
  const setAllPOIs              = useTripStore((state) => state.setAllPOIs);
  const setItinerary            = useTripStore((state) => state.setItinerary);
  
  const selectedPOIs = useMemo(() => allPOIs.filter((poi) => poi.isFavourited), [allPOIs]);

  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isNavigating,   setIsNavigating]   = useState(false);

  const handleRemove = useCallback((placeId: string) => toggleFavourite(placeId), [toggleFavourite]);

// ── INTELLIGENT RE-OPTIMIZE ACTION ──
  const handlePrimaryAction = useCallback(async () => {
    if (selectedPOIs.length === 0) return;
    setIsNavigating(true);
    
    if (itinerary && itinerary.days.length > 0) {
      try {
        const response = await fetch(`/api/itinerary`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tripId, 
            newPOIs: selectedPOIs 
          }),
        });

        if (!response.ok) throw new Error('Re-optimization failed');
        
        // 1. Clear the staging area locally first
        pushStagedToItinerary();
        
        // 2. Use Next.js magic to navigate and force the server to fetch the new DB rows
        router.push(`/itinerary/${tripId}`);
        router.refresh(); 

      } catch (error) {
        console.error('Failed to re-optimize itinerary:', error);
        setIsNavigating(false);
      }
    } else {
      router.push('/generate');
    }
  }, [selectedPOIs, router, itinerary, pushStagedToItinerary, tripId]);

  const totalCost    = calcTotalCost(selectedPOIs);
  const count        = selectedPOIs.length;
  const canGenerate  = count > 0 && !isNavigating;
  
  // Dynamic Button Label
  const hasExistingItinerary = !!(itinerary && itinerary.days.length > 0);
  const buttonLabel = hasExistingItinerary ? 'Add to Timeline' : 'Generate Itinerary';

  const innerContent = (
    <>
      <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-900 dark:text-white">Your Trip</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{count === 0 ? 'No places selected' : `${count} place${count !== 1 ? 's' : ''} selected`}</p>
        </div>
        {count > 0 && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">{count}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {count === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-2 py-2" aria-label="Selected places">
            {selectedPOIs.map((poi) => (
              <StagedPOIRow key={poi.placeId} poi={poi} onRemove={handleRemove} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200/60 dark:border-zinc-800 pt-4">
        {count > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5">
            <span className="text-xs font-medium text-zinc-500">Est. entry costs</span>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{totalCost === 0 ? 'All free!' : `£${totalCost.toLocaleString('en-GB')}`}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={!canGenerate}
          aria-label={count === 0 ? 'Add at least one place to continue' : `${buttonLabel} for ${count} selected place${count !== 1 ? 's' : ''}`}
          className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-full transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {isNavigating ? (
            <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Optimising route...</>
          ) : buttonLabel}
        </button>
        {count === 0 && <p className="text-center text-xs text-zinc-400">Add at least one place to continue.</p>}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: sticky glass sidebar */}
      <aside aria-label="Trip staging area" className="hidden lg:flex flex-col gap-4 sticky top-32 h-[calc(100vh-9rem)] max-h-[800px] w-80 flex-shrink-0 overflow-hidden rounded-2xl bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 p-6 z-40">
        {innerContent}
      </aside>

      {/* Mobile: frosted bottom panel */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {mobileExpanded && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileExpanded(false)} aria-hidden="true" />}
        <div className={`relative flex flex-col rounded-t-2xl border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md transition-all duration-300 ease-out ${mobileExpanded ? 'max-h-[80vh]' : 'max-h-24'}`}>
          <button type="button" onClick={() => setMobileExpanded((v) => !v)} aria-expanded={mobileExpanded} aria-label={mobileExpanded ? 'Collapse trip panel' : 'Expand trip panel'} className="flex w-full flex-col items-center gap-2 px-5 pt-3 pb-3 focus:outline-none">
            <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">{count}</span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{count === 0 ? 'No places added yet' : `${count} place${count !== 1 ? 's' : ''} selected`}</span>
              </div>
              <div className="flex items-center gap-3">
                {count > 0 && <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">£{totalCost.toLocaleString('en-GB')}</span>}
                <svg className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${mobileExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </div>
            </div>
          </button>
          {mobileExpanded && <div className="flex flex-1 flex-col gap-4 overflow-hidden px-5 pb-6">{innerContent}</div>}
        </div>
      </div>
    </>
  );
}