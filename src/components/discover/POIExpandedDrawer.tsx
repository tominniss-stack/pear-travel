'use client';

import { useEffect, useCallback } from 'react';
import { useTripStore } from '@/store/tripStore';
import type { POI } from '@/types';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}min`;
}

function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  return `£${cost.toLocaleString('en-GB')}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`h-4 w-4 ${i < Math.round(rating) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{rating.toFixed(1)}</span>
    </div>
  );
}

interface POIExpandedDrawerProps {
  poi: POI | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function POIExpandedDrawer({ poi, isOpen, onClose }: POIExpandedDrawerProps) {
  const toggleFavourite = useTripStore((state) => state.toggleFavourite);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!poi) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <div className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white dark:bg-slate-900 shadow-2xl sm:max-w-md transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="relative h-52 w-full flex-shrink-0 overflow-hidden bg-slate-200">
          {poi.photoReference ? (
            <img src={poi.photoReference} alt={poi.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-emerald-50 text-4xl">📍</div>
          )}
          <button onClick={onClose} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-all">✕</button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{poi.name}</h2>
          <div className="flex items-center gap-2 mb-6">
            <StarRating rating={poi.rating || 0} />
            {poi.totalRatings && <span className="text-slate-400 text-sm">({poi.totalRatings.toLocaleString('en-GB')} reviews)</span>}
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200">💷 {formatCost(poi.estimatedCostGBP)}</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200">⏱ {formatDuration(poi.avgDurationMinutes)}</span>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">About</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{poi.summary}</p>
            </div>

            {poi.openingHours?.weekdayDescriptions && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opening Hours</h3>
                <ul className="space-y-1.5">
                  {poi.openingHours.weekdayDescriptions.map((line, i) => (
                    <li key={i} className="text-sm flex justify-between">
                      <span className="font-medium text-slate-500">{line.split(': ')[0]}</span>
                      <span className="text-slate-700 dark:text-slate-200">{line.split(': ')[1] || '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
          <button 
            onClick={() => toggleFavourite(poi.placeId)}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${poi.isFavourited ? 'bg-brand-600 text-white shadow-md' : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {poi.isFavourited ? 'Added to Trip ✓' : 'Add to Trip'}
          </button>
          <a href={poi.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Open in Google Maps
          </a>
        </div>
      </div>
    </>
  );
}