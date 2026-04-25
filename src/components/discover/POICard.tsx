'use client';

import { useState, useCallback } from 'react';
import { useTripStore } from '@/store/tripStore';
import type { POI } from '@/types';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours     = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}min`;
}

function formatCost(costGBP: number): string {
  if (costGBP === 0) return 'Free';
  return `£${costGBP.toLocaleString('en-GB')}`;
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

function StarRating({ rating }: { rating: number }) {
  const fullStars  = Math.floor(rating);
  const hasHalf    = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg key={`full-${i}`} className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalf && (
        <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-grad">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#d1d5db" />
            </linearGradient>
          </defs>
          <path fill="url(#half-grad)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg key={`empty-${i}`} className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-zinc-500">{rating.toFixed(1)}</span>
    </div>
  );
}

export function POICardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 animate-pulse">
      <div className="aspect-[4/3] w-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-3 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-3/4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-5/6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 flex gap-2">
          <div className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

interface POICardProps {
  poi: POI;
  onExpand?: () => void;
  onToggleFavourite?: (poi: POI) => void;
}

export default function POICard({ poi, onExpand, onToggleFavourite }: POICardProps) {
  const toggleFavourite = useTripStore((state) => state.toggleFavourite);
  const [imgError, setImgError]   = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleFavouriteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavourite) {
      onToggleFavourite(poi);
      return;
    }
    toggleFavourite(poi.placeId);
  }, [onToggleFavourite, poi, toggleFavourite]);

  const showImage = poi.photoReference && !imgError;

  return (
    <article
      onClick={onExpand}
      className={`group flex flex-col w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl overflow-hidden transition-colors duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 ${onExpand ? 'cursor-pointer' : ''} ${poi.isFavourited ? 'ring-2 ring-brand-500/40' : ''}`}
      aria-label={`${poi.name} — ${poi.category}`}
    >
      {/* ── Edge-to-Edge Image ── */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0">
        {showImage ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-zinc-200 dark:bg-zinc-800" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poi.photoReference}
              alt={`Photo of ${poi.name}`}
              className={`object-cover w-full h-full transition-transform duration-700 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800">
            <span className="text-4xl" aria-hidden="true">{getCategoryEmoji(poi.category)}</span>
            <span className="text-xs text-zinc-400">{poi.category}</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full bg-white/80 dark:bg-black/60 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200 backdrop-blur-sm">
            {poi.category}
          </span>
        </div>

        {/* Favourite button */}
        <button
          type="button"
          onClick={handleFavouriteClick}
          aria-label={poi.isFavourited ? `Remove ${poi.name} from trip` : `Add ${poi.name} to trip`}
          aria-pressed={poi.isFavourited}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
            poi.isFavourited
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'bg-white/80 dark:bg-black/60 text-zinc-400 hover:bg-white dark:hover:bg-black hover:text-brand-500'
          }`}
        >
          <svg className="h-4 w-4" fill={poi.isFavourited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      {/* ── Card Body ── */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-white line-clamp-1 leading-snug">
          {poi.name}
        </h3>

        {poi.rating !== undefined && (
          <div className="flex items-center gap-2">
            <StarRating rating={poi.rating} />
            {poi.totalRatings !== undefined && (
              <span className="text-xs text-zinc-400">({poi.totalRatings.toLocaleString('en-GB')})</span>
            )}
          </div>
        )}

        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{poi.summary}</p>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${poi.estimatedCostGBP === 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
            <span aria-hidden="true">💷</span>{formatCost(poi.estimatedCostGBP)}
          </span>

          <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span aria-hidden="true">⏱</span>{formatDuration(poi.avgDurationMinutes)}
          </span>

          {poi.openingHours?.openNow !== undefined && (
            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${poi.openingHours.openNow ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${poi.openingHours.openNow ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden="true" />
              {poi.openingHours.openNow ? 'Open now' : 'Closed'}
            </span>
          )}
        </div>

        <a
          href={poi.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label={`Open ${poi.name} in Google Maps`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          View on Google Maps
        </a>
      </div>
    </article>
  );
}
