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
    <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700/50">
      
      {/* Action Menu (Three Dots) */}
      <div className="absolute right-4 top-4 z-20" ref={menuRef}>
        <button 
          onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
          disabled={isSaving}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors disabled:opacity-50"
        >
          <span className="text-lg leading-none mb-2">...</span>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            <button 
              onClick={(e) => { e.preventDefault(); setShowMenu(false); setIsRenaming(true); }}
              className="flex w-full items-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              ✏️ Rename Trip
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); handleToggleStatus(); }}
              className="flex w-full items-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700/50"
            >
              {trip.isBooked ? '🗺️ Revert to Planning' : '✈️ Mark as Booked'}
            </button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <Link href={`/itinerary/${trip.id}`} className="flex-1 flex flex-col">
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm border ${
            trip.isBooked 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' 
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
          }`}>
            {trip.isBooked ? '✓ Booked' : '⏳ Planning'}
          </span>
        </div>

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
              className="w-full rounded-lg border border-brand-500 bg-brand-50 dark:bg-slate-800 px-2 py-1 text-xl font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              onClick={(e) => e.preventDefault()}
            />
          ) : (
            <h3 className="text-xl font-black text-slate-900 dark:text-white line-clamp-2 leading-tight">
              {trip.title}
            </h3>
          )}
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>📍</span> {trip.destination}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {trip.startDate && trip.endDate 
                ? `${format(new Date(trip.startDate), 'd MMM')} - ${format(new Date(trip.endDate), 'd MMM')}` 
                : `${trip.duration} Days`}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Budget</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              £{trip.budgetGBP.toLocaleString('en-GB')}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}