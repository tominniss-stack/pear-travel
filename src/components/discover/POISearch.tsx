// ─────────────────────────────────────────────────────────────────────────────
// POI Search Input Component
// Allows users to search for and manually add places to their trip
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTripStore } from '@/store/tripStore';
import POICard from '@/components/discover/POICard';
import type { POI } from '@/types';

interface POISearchProps {
  destination: string;
}

export default function POISearch({ destination }: POISearchProps) {
  // THE FIX: Use the correct Zustand selectors!
  const allPOIs = useTripStore((state) => state.allPOIs);
  const setAllPOIs = useTripStore((state) => state.setAllPOIs);
  const toggleFavourite = useTripStore((state) => state.toggleFavourite);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<POI | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const isAdded = useMemo(
    () => !!searchResult && allPOIs.some((poi) => poi.placeId === searchResult.placeId && poi.isFavourited),
    [searchResult, allPOIs],
  );

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!searchQuery.trim()) {
        setSearchError('Please enter a place name');
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setSearchResult(null);

      try {
        const response = await fetch('/api/pois/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery.trim(),
            destination,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? 'Failed to search for places');
        }

        const data = await response.json();
        setHasSearched(true);

        if (data.poi) {
          setSearchResult(data.poi);
        } else {
          setSearchError('No places found matching your search. Try a different name.');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred while searching';
        setSearchError(message);
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, destination],
  );

  const handleAddToTrip = useCallback(() => {
    if (searchResult) {
      // 1. If it's a brand new place not in the main list, inject it!
      if (!allPOIs.some(p => p.placeId === searchResult.placeId)) {
        setAllPOIs([searchResult, ...allPOIs]);
      }
      
      // 2. Toggle the heart so it goes into the staging area
      toggleFavourite(searchResult.placeId);
      
      // 3. Clear the search
      setSearchQuery('');
      setSearchResult(null);
      setHasSearched(false);
    }
  }, [searchResult, allPOIs, setAllPOIs, toggleFavourite]);

  return (
    <div className="rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 font-medium text-xl tracking-tight text-zinc-900 dark:text-white mb-4">
          <span aria-hidden="true">🔍</span>
          Add a Specific Place
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Couldn't find something you want to do? Search for any place and add it manually to your trip.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="e.g. 'British Museum', 'Tower Bridge', 'Borough Market'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSearching}
            className="flex-1 bg-transparent border-b-2 border-zinc-200 focus:border-zinc-900 dark:border-zinc-800 dark:focus:border-white text-base placeholder:text-zinc-400 outline-none py-3 transition-colors rounded-none disabled:opacity-60 text-zinc-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching…
              </span>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </div>

      {searchError && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 mb-4">
          <p className="text-sm text-red-700 dark:text-red-200">{searchError}</p>
        </div>
      )}

      {hasSearched && !searchResult && !searchError && (
        <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-8 text-center">
          <span className="text-3xl mb-3 block" aria-hidden="true">🔎</span>
          <p className="text-sm text-zinc-500">
            No results found. Try searching with a different name or try looking in the suggestions above.
          </p>
        </div>
      )}

      {searchResult && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
              Search Result
            </p>
          </div>
          <div className="relative">
            <POICard
              poi={{ ...searchResult, isFavourited: isAdded }}
              onExpand={() => {}}
            />
          </div>
          <button
            onClick={handleAddToTrip}
            className={`w-full rounded-full px-4 py-3 text-sm font-medium text-white transition-all active:scale-[0.98] ${isAdded ? 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed text-zinc-500' : 'bg-brand-600 hover:bg-brand-700'}`}
            disabled={isAdded}
          >
            {isAdded ? '✓ Added to Clipboard' : 'Add to Trip'}
          </button>
        </div>
      )}
    </div>
  );
}