// ─────────────────────────────────────────────────────────────────────────────
// Discovery Page — Pear Travel v2
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTripStore, useHydratedTripStore } from '@/store/tripStore';
import POICard, { POICardSkeleton } from '@/components/discover/POICard';
import StagingArea from '@/components/discover/StagingArea';
import CategoryFilter from '@/components/discover/CategoryFilter';
import POIExpandedDrawer from '@/components/discover/POIExpandedDrawer';
import POISearch from '@/components/discover/POISearch';
import type { POI, Interest } from '@/types';

const SKELETON_COUNT = 9;

// ── Shared Config ─────────────────────────────────────────────────────────────
const AVAILABLE_INTERESTS: { label: Interest; emoji: string }[] = [
  { label: 'History',             emoji: '🏛️' },
  { label: 'Food & Drink',        emoji: '🍽️' },
  { label: 'Art & Culture',       emoji: '🎨' },
  { label: 'Off the Beaten Path', emoji: '🧭' },
  { label: 'Nightlife',           emoji: '🌙' },
  { label: 'Architecture',        emoji: '🏗️' },
  { label: 'Nature & Parks',      emoji: '🌿' },
  { label: 'Shopping',            emoji: '🛍️' },
  { label: 'Music & Theatre',     emoji: '🎭' },
  { label: 'Sport',               emoji: '⚽' },
];

// ── LoadingState ──────────────────────────────────────────────────────────────

function LoadingState({ destination }: { destination: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-20" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <span className="text-2xl" aria-hidden="true">🔍</span>
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Scouring{' '}
            <span className="text-brand-600">
              {destination || 'your destination'}
            </span>{' '}
            for the best spots…
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Searching museums, restaurants, hidden gems, and more.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <POICardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ── ErrorState ────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden="true">😕</span>
      <div>
        <h2 className="text-lg font-bold text-red-700">Something went wrong</h2>
        <p className="mt-1.5 max-w-sm text-sm text-red-500 leading-relaxed">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="
          rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white
          shadow-sm transition-all hover:bg-red-700
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        "
      >
        Try Again
      </button>
    </div>
  );
}

// ── EmptyFilterState ──────────────────────────────────────────────────────────

function EmptyFilterState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden="true">🔎</span>
      <div>
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
          No places in this category
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Try a different filter or view all places.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="
          rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm
          font-semibold text-slate-600 shadow-sm transition-all
          hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700
          focus:outline-none focus:ring-2 focus:ring-brand-500
        "
      >
        Show all places
      </button>
    </div>
  );
}

// ── HydrationSkeleton ─────────────────────────────────────────────────────────

function HydrationSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <POICardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const intake            = useHydratedTripStore((state) => state.intake);
  const itinerary         = useHydratedTripStore((state) => state.itinerary); 
  const allPOIs           = useHydratedTripStore((state) => state.allPOIs);
  const setAllPOIs        = useTripStore((state) => state.setAllPOIs);
  const updateIntakeField = useTripStore((state) => state.updateIntakeField);

  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [hasFetched,     setHasFetched]     = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const [isFetchingMore,   setIsFetchingMore]   = useState(false);
  const [showInterestMenu, setShowInterestMenu] = useState(false);
  const [interestToRemove, setInterestToRemove] = useState<Interest | null>(null);

  const [selectedPOIId, setSelectedPOIId] = useState<string | null>(null);
  const [isDrawerOpen,  setIsDrawerOpen]  = useState(false);

  // ── Bulletproof Destination Fallback ──
  const activeDestination = itinerary?.essentials?.destination || intake?.destination || '';
  const activeDuration    = itinerary?.days?.length || intake?.duration;

  useEffect(() => {
    if (intake !== undefined && !activeDestination) {
      router.replace('/');
    }
  }, [intake, activeDestination, router]);

  useEffect(() => {
    if (interestToRemove) {
      const timer = setTimeout(() => setInterestToRemove(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [interestToRemove]);

  // ── Initial Data Load ──────────────────────────────────────────────────────

  const fetchPOIs = useCallback(async () => {
    if (!activeDestination) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pois', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeDestination, 
          interests:   intake?.interests || [],
        }),
      });

      if (!response.ok) throw new Error(`Failed to fetch places (${response.status}).`);

      const data       = await response.json();
      const pois: POI[] = data.pois ?? [];

      if (pois.length === 0) {
        throw new Error(`We couldn't find any places matching your interests.`);
      }

      setAllPOIs(pois);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [activeDestination, intake?.interests, setAllPOIs]);

  useEffect(() => {
    if (intake === undefined || allPOIs === undefined || !activeDestination) return;

    if (allPOIs.length === 0 && !hasFetched) {
      fetchPOIs();
    } else if (allPOIs.length > 0 && !hasFetched) {
      setHasFetched(true);
    }
  }, [intake, allPOIs, hasFetched, activeDestination, fetchPOIs]);


  // ── Surgical Interest Addition ──────────────────────────────────────────────
  
  const handleAddInterest = useCallback(async (newInterest: Interest) => {
    if (!activeDestination || !allPOIs || !intake) return;
    setShowInterestMenu(false);
    setIsFetchingMore(true);

    const updatedInterests = [...intake.interests, newInterest];
    updateIntakeField('interests', updatedInterests);

    try {
      const response = await fetch('/api/pois', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeDestination, 
          interests:   [newInterest], 
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch new places');
      const data = await response.json();
      const newPois: POI[] = data.pois ?? [];

      const existingIds = new Set(allPOIs.map(p => p.placeId));
      const uniqueNewPois = newPois.filter(p => !existingIds.has(p.placeId));

      if (uniqueNewPois.length > 0) {
         setAllPOIs([...allPOIs, ...uniqueNewPois]);
      }
    } catch (err) {
      console.error('Failed to add interest', err);
      updateIntakeField('interests', intake.interests);
    } finally {
      setIsFetchingMore(false);
    }
  }, [activeDestination, intake, allPOIs, setAllPOIs, updateIntakeField]);


  // ── Soft Purge Interest Removal (Protects Favourites) ───────────────────────
  
  const handleRemoveInterest = useCallback((interestTarget: Interest) => {
    if (!intake || !allPOIs) return;

    const updatedInterests = intake.interests.filter(i => i !== interestTarget);
    updateIntakeField('interests', updatedInterests);

    const keywordMap: Record<string, string[]> = {
      'History': ['history', 'museum', 'monument', 'historic', 'ruin', 'castle'],
      'Food & Drink': ['food', 'restaurant', 'cafe', 'bar', 'dining', 'drink', 'market'],
      'Art & Culture': ['art', 'culture', 'gallery', 'museum', 'theatre', 'exhibition'],
      'Off the Beaten Path': ['hidden', 'alternative', 'secret', 'local'],
      'Nightlife': ['club', 'bar', 'night', 'pub', 'lounge'],
      'Architecture': ['architecture', 'building', 'church', 'cathedral', 'plaza'],
      'Nature & Parks': ['nature', 'park', 'garden', 'outdoor', 'beach', 'hill'],
      'Shopping': ['shop', 'market', 'mall', 'boutique', 'store'],
      'Music & Theatre': ['music', 'theatre', 'concert', 'live', 'venue'],
      'Sport': ['sport', 'stadium', 'arena', 'match', 'club']
    };

    const keywords = keywordMap[interestTarget] || [interestTarget.toLowerCase()];

    const cleanedPOIs = allPOIs.filter(poi => {
      if (poi.isFavourited) return true; 

      const cat = poi.category.toLowerCase();
      const sum = poi.summary.toLowerCase();
      const isMatch = keywords.some(kw => cat.includes(kw) || sum.includes(kw));
      
      return !isMatch; 
    });

    setAllPOIs(cleanedPOIs);
  }, [intake, allPOIs, updateIntakeField, setAllPOIs]);


  // ── Derived Data ────────────────────────────────────────────────────────────

  // ── DUPLICATION FIX: Identify already scheduled IDs ──
  const scheduledPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    if (itinerary) {
      // Add IDs from days
      itinerary.days.forEach(day => {
        day.entries.forEach(entry => {
          if (entry.placeId) ids.add(entry.placeId);
        });
      });
      // Add IDs from Parking Lot
      itinerary.unscheduledOptions?.forEach(entry => {
        if (entry.placeId) ids.add(entry.placeId);
      });
    }
    return ids;
  }, [itinerary]);

  // Filter out any POIs that are already in the itinerary
  const safePOIs = useMemo(() => {
    return (allPOIs ?? []).filter(poi => !scheduledPlaceIds.has(poi.placeId));
  }, [allPOIs, scheduledPlaceIds]);

  const categories = useMemo(() => {
    const cats = new Set(safePOIs.map((poi) => poi.category));
    return Array.from(cats).sort();
  }, [safePOIs]);

  const categoryCounts = useMemo(() => {
    return safePOIs.reduce<Record<string, number>>((acc, poi) => {
      acc[poi.category] = (acc[poi.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [safePOIs]);

  const filteredPOIs = useMemo(() => {
    if (activeCategory === 'All') return safePOIs;
    return safePOIs.filter((poi) => poi.category === activeCategory);
  }, [safePOIs, activeCategory]);

  const favouriteCount = useMemo(
    () => safePOIs.filter((poi) => poi.isFavourited).length,
    [safePOIs],
  );

  const selectedPOI = useMemo(
    () => (allPOIs ?? []).find((p) => p.placeId === selectedPOIId) ?? null,
    [allPOIs, selectedPOIId],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCategoryChange = useCallback((category: string) => setActiveCategory(category), []);
  const handleResetFilter = useCallback(() => setActiveCategory('All'), []);
  const handleOpenDrawer = useCallback((poi: POI) => { setSelectedPOIId(poi.placeId); setIsDrawerOpen(true); }, []);
  const handleCloseDrawer = useCallback(() => { setIsDrawerOpen(false); setTimeout(() => setSelectedPOIId(null), 400); }, []);

  // ── Hydration Guard ─────────────────────────────────────────────────────────

  if (intake === undefined || allPOIs === undefined) {
    return <HydrationSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">

          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/itinerary/${tripId}`)} 
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Discover <span className="text-brand-600 dark:text-brand-400">{activeDestination}</span>
              </h1>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                {activeDuration} day{activeDuration !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {intake.budgetGBP > 0 && (
            <div className="flex-shrink-0 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Budget: £{intake.budgetGBP.toLocaleString('en-GB')}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex gap-6 items-start">

          <div className="flex min-w-0 flex-1 flex-col gap-5">

            {/* ── Dynamic Vibe Bar (Mobile-First UX) ── */}
            {hasFetched && !isLoading && (
              <div className="flex flex-col gap-3 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Trip Vibes</p>
                  {isFetchingMore && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-600 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600"></span> Fetching Gems...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {intake.interests.map((interest) => {
                    const info = AVAILABLE_INTERESTS.find(i => i.label === interest);
                    const isConfirming = interestToRemove === interest;
                    
                    return (
                      <button 
                        key={interest} 
                        onClick={() => {
                          if (isConfirming) {
                            handleRemoveInterest(interest);
                            setInterestToRemove(null);
                          } else {
                            setInterestToRemove(interest);
                          }
                        }}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shadow-sm border ${
                          isConfirming 
                            ? 'bg-red-500 text-white border-red-600 animate-pulse' 
                            : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 active:scale-95'
                        }`}
                      >
                        {isConfirming ? (
                          <span>Remove?</span>
                        ) : (
                          <>
                            <span>{info?.emoji}</span>
                            <span>{interest}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setShowInterestMenu(true)}
                    disabled={isFetchingMore}
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-50/50 dark:bg-brand-900/10 px-4 py-2.5 text-sm font-bold text-brand-600 dark:text-brand-400 border border-dashed border-brand-200 dark:border-brand-800/50 transition-all disabled:opacity-50"
                  >
                    <span>+</span> <span>Add Vibe</span>
                  </button>

                  {/* Fixed Center Modal for adding vibes */}
                  {showInterestMenu && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowInterestMenu(false)} />
                      <div className="relative z-10 w-full max-w-xs rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden py-2 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">More Interests</p>
                          <button onClick={() => setShowInterestMenu(false)} className="text-slate-400 hover:text-slate-600 font-black text-lg">&times;</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {AVAILABLE_INTERESTS.filter(i => !intake.interests.includes(i.label)).map(i => (
                            <button
                              key={i.label}
                              onClick={() => handleAddInterest(i.label)}
                              className="w-full text-left px-4 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                            >
                              <span className="text-xl">{i.emoji}</span> {i.label}
                            </button>
                          ))}
                        </div>
                        {AVAILABLE_INTERESTS.filter(i => !intake.interests.includes(i.label)).length === 0 && (
                          <div className="px-4 py-6 text-sm text-slate-400 text-center font-bold">You've got the full vibe.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results + Filters */}
            {hasFetched && safePOIs.length > 0 && !isLoading && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Found <span className="font-semibold text-slate-700 dark:text-slate-200">{safePOIs.length}</span> places
                    </p>
                    {favouriteCount > 0 && (
                      <p className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-lg border border-brand-200 dark:border-brand-800/50">
                        {favouriteCount} Added to trip
                      </p>
                    )}
                  </div>
                  <CategoryFilter
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    totalCount={safePOIs.length}
                    categoryCounts={categoryCounts}
                  />
                </div>
                <POISearch destination={activeDestination} />
              </div>
            )}

            {/* Content area */}
            {isLoading ? (
              <LoadingState destination={activeDestination} />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchPOIs} />
            ) : hasFetched && filteredPOIs.length === 0 && safePOIs.length > 0 ? (
              <EmptyFilterState onReset={handleResetFilter} />
            ) : hasFetched && safePOIs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredPOIs.map((poi) => (
                    <POICard
                      key={poi.placeId}
                      poi={poi}
                      onExpand={() => handleOpenDrawer(poi)}
                    />
                  ))}
                </div>
                <div className="h-28 lg:hidden" aria-hidden="true" />
              </>
            ) : null}
          </div>

          <StagingArea tripId={tripId} />
        </div>
      </main>

      <POIExpandedDrawer
        poi={selectedPOI}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}