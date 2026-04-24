'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { renameTripAction, toggleTripBookingStatusAction } from '@/app/actions/trip';

export default function TripCard({ trip }: { trip: any }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(trip.title);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input automatically when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRenaming]);

  const handleRenameSubmit = async () => {
    if (!newTitle.trim() || newTitle === trip.title) {
      setIsRenaming(false);
      setNewTitle(trip.title);
      return;
    }

    setIsSaving(true);
    try {
      await renameTripAction(trip.id, newTitle.trim());
      setIsRenaming(false);
    } catch (error) {
      console.error('Failed to rename:', error);
      setNewTitle(trip.title); // revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setShowMenu(false);
    setIsSaving(true);
    try {
      await toggleTripBookingStatusAction(trip.id, trip.isBooked);
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewTitle(trip.title);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 overflow-hidden transition-colors duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-900">

      {/* Action Menu (Three Dots) */}
      <div className="absolute right-4 top-4 z-20" ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
          disabled={isSaving}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 transition-colors disabled:opacity-50"
        >
          <span className="text-lg leading-none mb-2">...</span>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={(e) => { e.preventDefault(); setShowMenu(false); setIsRenaming(true); }}
              className="flex w-full items-center px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              ✏️ Rename Trip
            </button>
            <button
              onClick={(e) => { e.preventDefault(); handleToggleStatus(); }}
              className="flex w-full items-center px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-t border-zinc-100 dark:border-zinc-800"
            >
              {trip.isBooked ? '🗺️ Revert to Planning' : '✈️ Mark as Booked'}
            </button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <Link href={`/itinerary/${trip.id}`} className="flex-1 flex flex-col p-5 sm:p-6">

        {/* Status Badge */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] tracking-widest uppercase font-medium bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {trip.isBooked ? '✓ Booked' : '⏳ Planning'}
          </span>
        </div>

        {/* Title */}
        <div className="mb-6 flex-1 pr-8">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="w-full rounded-xl border border-brand-500 bg-white dark:bg-zinc-900 px-3 py-2 text-xl font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              onClick={(e) => e.preventDefault()}
            />
          ) : (
            <h3 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-white line-clamp-2 leading-tight">
              {trip.title}
            </h3>
          )}
          <p className="mt-2 text-sm text-zinc-500">
            {trip.destination}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between border-t border-zinc-200/60 dark:border-zinc-800 pt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">Duration</span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {trip.startDate && trip.endDate
                ? `${format(new Date(trip.startDate), 'd MMM')} – ${format(new Date(trip.endDate), 'd MMM')}`
                : `${trip.duration} Days`}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">Budget</span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              £{trip.budgetGBP.toLocaleString('en-GB')}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
