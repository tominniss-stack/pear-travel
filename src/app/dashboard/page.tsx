'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { renameTripAction, toggleTripBookingStatusAction } from '@/app/actions/trip';
import { useHydratedProfileStore } from '@/store/profileStore';

type TripCardData = {
  id: string;
  title: string;
  destination: string;
  duration: number;
  startDate: string | null;
  endDate: string | null;
  budgetGBP: number;
  createdAt: string;
  isBooked: boolean;
};

// ── Interactive Trip Card Component ──────────────────────────────────────────

function TripCard({ trip, onDelete, onUpdate }: { trip: TripCardData; onDelete: (id: string) => void; onUpdate: (updatedTrip: TripCardData) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(trip.title || `Trip to ${trip.destination}`);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu if clicking outside (Desktop & Mobile safe)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Auto-focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) inputRef.current.focus();
  }, [isRenaming]);

  const handleRenameSubmit = async () => {
    if (!newTitle.trim() || newTitle === trip.title) {
      setIsRenaming(false);
      setNewTitle(trip.title || `Trip to ${trip.destination}`);
      return;
    }
    setIsSaving(true);
    try {
      await renameTripAction(trip.id, newTitle.trim());
      onUpdate({ ...trip, title: newTitle.trim() });
      setIsRenaming(false);
    } catch (error) {
      setNewTitle(trip.title);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setIsSaving(true);
    try {
      await toggleTripBookingStatusAction(trip.id, trip.isBooked);
      onUpdate({ ...trip, isBooked: !trip.isBooked });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/trip/${trip.id}`, { method: 'DELETE' });
      if (res.ok) onDelete(trip.id);
      else {
        alert("Failed to delete.");
        setIsDeleting(false);
        setConfirmDelete(false);
      }
    } catch (err) {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full group">

      {/* ── Action Menu (Three Dots) ── */}
      <div className="absolute right-3 top-3 z-30" ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
          disabled={isSaving}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 transition-colors disabled:opacity-50"
          aria-label="Trip Options"
        >
          <span className="text-xl leading-none pb-2">...</span>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-52 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 sm:w-48 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); setIsRenaming(true); }}
              className="flex w-full items-center px-4 py-3.5 sm:py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              ✏️ Rename Trip
            </button>
            <button
              onClick={handleToggleStatus}
              className="flex w-full items-center px-4 py-3.5 sm:py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-t border-zinc-100 dark:border-zinc-800"
            >
              {trip.isBooked ? '🗺️ Revert to Planning' : '✈️ Mark as Booked'}
            </button>
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <Link
        href={`/itinerary/${trip.id}`}
        onClick={(e) => { if (isRenaming) e.preventDefault(); }}
        className={`flex flex-col flex-1 overflow-hidden rounded-3xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 transition-colors duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
          isDeleting ? 'opacity-30 grayscale pointer-events-none' : ''
        }`}
      >
        <div className="flex flex-1 flex-col p-5 sm:p-6 relative z-10">

          {/* Status Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] tracking-widest uppercase font-medium border ${
              trip.isBooked
                ? 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
            }`}>
              {trip.isBooked ? '✓ Booked' : '⏳ Planning'}
            </span>
          </div>

          {/* Title Area */}
          <div className="mb-6 flex flex-col gap-1 pr-10">
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleRenameSubmit(); }
                  if (e.key === 'Escape') { setIsRenaming(false); setNewTitle(trip.title); }
                }}
                disabled={isSaving}
                className="w-full rounded-xl border border-brand-500 bg-white dark:bg-zinc-900 px-3 py-2 text-lg sm:text-xl font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                onClick={(e) => e.preventDefault()}
              />
            ) : (
              <h3 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-white line-clamp-2 leading-tight">
                {trip.title || `Trip to ${trip.destination}`}
              </h3>
            )}
            <span className="text-sm text-zinc-500 mt-1">
              {trip.destination}
            </span>
          </div>

          {/* Metadata */}
          <div className="mt-auto flex flex-col gap-2 text-sm text-zinc-500">
            <span>
              {trip.startDate && trip.endDate
                ? `${format(new Date(trip.startDate), 'MMM d')} – ${format(new Date(trip.endDate), 'MMM d, yyyy')}`
                : `${trip.duration} days`}
            </span>
            <span>£{trip.budgetGBP.toLocaleString('en-GB')} budget</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-zinc-200/60 dark:border-zinc-800 px-5 sm:px-6 py-4 flex justify-between items-center min-h-[60px] relative z-20">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">
            {format(new Date(trip.createdAt), 'dd MMM yyyy')}
          </p>

          <div className="flex items-center gap-3">
            {confirmDelete && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false); }}
                className="text-[10px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors py-2"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleDelete}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-medium uppercase tracking-wider transition-all border ${
                confirmDelete
                  ? 'bg-red-600 text-white border-red-700 animate-pulse'
                  : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50'
              }`}
            >
              {isDeleting ? '…' : confirmDelete ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const hasCompletedOnboarding = useHydratedProfileStore((s) => s.hasCompletedOnboarding);
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Onboarding Interceptor ──────────────────────────────────────────────────
  // Wait for the profile store to hydrate from localStorage before checking.
  // If the user hasn't completed onboarding, redirect to /welcome.
  useEffect(() => {
    if (hasCompletedOnboarding === undefined) return; // Still hydrating
    if (hasCompletedOnboarding === false) {
      router.replace('/welcome');
    }
  }, [hasCompletedOnboarding, router]);

  useEffect(() => {
    fetch('/api/trips').then(res => res.json()).then(data => {
      setTrips(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const removeTripFromUI = (id: string) => setTrips(prev => prev.filter(t => t.id !== id));
  
  // Updates the specific card in state after a successful Server Action
  const updateTripInUI = (updatedTrip: TripCardData) => {
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  };

  // While hydrating or redirecting, show the loading spinner
  if (hasCompletedOnboarding === undefined || hasCompletedOnboarding === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6" />
        <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px]">Loading…</p>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6" />
      <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px]">Loading Trips...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 px-4 sm:px-6 lg:px-8 pt-24 pb-12 animate-in fade-in duration-500">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl sm:text-4xl tracking-tight font-medium text-zinc-900 dark:text-white">My Trips</h1>
            <p className="text-sm text-zinc-500 mt-2">Manage your saved Pear Travel itineraries.</p>
          </div>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-brand-700 active:scale-95 transition-all w-full sm:w-auto"
          >
            <span className="text-base leading-none">+</span> New Trip
          </Link>
        </div>

        {/* Grid or Empty State */}
        {trips.length === 0 ? (
          <div className="px-6 py-24 sm:py-32 text-center">
            <span className="text-6xl sm:text-7xl block mb-6">🏝️</span>
            <h3 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white">Your passport is empty</h3>
            <p className="text-sm text-zinc-500 mt-2 mb-8">Ready to plan your next adventure?</p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-brand-700 active:scale-95 transition-all"
            >
              Start Planning →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-8">
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onDelete={removeTripFromUI}
                onUpdate={updateTripInUI}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}