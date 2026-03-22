'use client';

import { useState, useCallback } from 'react';
import { useTripStore } from '@/store/tripStore';
import type { POI } from '@/types';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours   = Math.floor(minutes / 60);
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
        <svg key={`empty-${i}`} className="h-3.5 w-3.5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-600">{rating.toFixed(1)}</span>
    </div>
  );
}

export function POICardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm animate-pulse">
      <div className="h-44 w-full bg-slate-200" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-3 w-20 rounded-full bg-slate-200" />
        <div className="h-5 w-3/4 rounded-full bg-slate-200" />
        <div className="h-3 w-full rounded-full bg-slate-200" />
        <div className="h-3 w-5/6 rounded-full bg-slate-200" />
        <div className="mt-2 flex gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-200" />
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="mt-1 h-10 w-full rounded-xl bg-slate-200" />
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
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleFavouriteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents the card click from firing

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
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${onExpand ? 'cursor-pointer' : ''} ${poi.isFavourited ? 'border-brand-300 ring-2 ring-brand-200' : 'border-slate-100 hover:border-slate-200'}`} 
      aria-label={`${poi.name} — ${poi.category}`}
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 flex-shrink-0">
        {showImage ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poi.photoReference} alt={`Photo of ${poi.name}`} className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-4xl" aria-hidden="true">{getCategoryEmoji(poi.category)}</span>
            <span className="text-xs font-medium text-slate-400">{poi.category}</span>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">{poi.category}</span>
        </div>

        <button type="button" onClick={handleFavouriteClick} aria-label={poi.isFavourited ? `Remove ${poi.name} from trip` : `Add ${poi.name} to trip`} aria-pressed={poi.isFavourited} className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${poi.isFavourited ? 'bg-brand-600 text-white hover:bg-brand-700 scale-110' : 'bg-white/90 text-slate-400 hover:bg-white hover:text-brand-500'}`}>
          <svg className="h-4 w-4 transition-transform duration-200" fill={poi.isFavourited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-1 text-base font-bold text-slate-800 leading-snug">{poi.name}</h3>

        {poi.rating !== undefined && (
          <div className="flex items-center gap-2">
            <StarRating rating={poi.rating} />
            {poi.totalRatings !== undefined && (
              <span className="text-xs text-slate-400">({poi.totalRatings.toLocaleString('en-GB')})</span>
            )}
          </div>
        )}

        <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{poi.summary}</p>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${poi.estimatedCostGBP === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            <span aria-hidden="true">💷</span>{formatCost(poi.estimatedCostGBP)}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            <span aria-hidden="true">⏱</span>{formatDuration(poi.avgDurationMinutes)}
          </span>

          {poi.openingHours?.openNow !== undefined && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${poi.openingHours.openNow ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${poi.openingHours.openNow ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden="true" />
              {poi.openingHours.openNow ? 'Open now' : 'Closed'}
            </span>
          )}
        </div>

        <a href={poi.googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500" aria-label={`Open ${poi.name} in Google Maps`}>
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