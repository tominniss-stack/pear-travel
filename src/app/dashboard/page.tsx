'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

type TripCardData = {
  id: string;
  destination: string;
  duration: number;
  startDate: string | null;
  endDate: string | null;
  budgetGBP: number;
  createdAt: string;
};

function TripCard({ trip, onDelete }: { trip: TripCardData; onDelete: (id: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    <div className="relative flex flex-col h-full">
      <Link
        href={`/itinerary/${trip.id}`}
        className={`flex flex-col flex-1 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all duration-300 hover:border-brand-500 hover:shadow-xl dark:hover:border-brand-400 ${
          isDeleting ? 'opacity-30 grayscale pointer-events-none' : ''
        }`}
      >
        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2">{trip.destination}</h3>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300 transition-transform group-hover:translate-x-1">↗</span>
          </div>

          <div className="mt-auto flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
            <div className="flex items-center gap-2"><span>📅</span>
              {trip.startDate && trip.endDate ? (
                <span>{format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}</span>
              ) : (
                <span>{trip.duration} days</span>
              )}
            </div>
            <div className="flex items-center gap-2"><span>💷</span><span>£{trip.budgetGBP.toLocaleString('en-GB')} budget</span></div>
          </div>
        </div>

        {/* Footer with properly nested delete button */}
        <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 px-6 py-4 flex justify-between items-center min-h-[64px]">
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            {format(new Date(trip.createdAt), 'dd MMM yyyy')}
          </p>
          
          <div className="flex items-center gap-2">
            {confirmDelete && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false); }}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleDelete}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm ${
                confirmDelete 
                  ? 'bg-red-600 text-white border-red-700 animate-pulse' 
                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:text-red-500 hover:border-red-200'
              }`}
            >
              {isDeleting ? '...' : confirmDelete ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trips').then(res => res.json()).then(data => {
      setTrips(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const removeTripFromUI = (id: string) => setTrips(prev => prev.filter(t => t.id !== id));

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Loading Trips...</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white sm:text-5xl">My Trips</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">Manage your saved Pear Travel itineraries.</p>
        </div>
        <Link href="/" className="bg-brand-600 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg hover:bg-brand-700 hover:-translate-y-0.5 transition-all">+ New Trip</Link>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 py-32 text-center">
          <span className="text-6xl block mb-6">🏝️</span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your passport is empty</h3>
          <p className="text-slate-500 mt-2 mb-8">Ready to plan your next adventure?</p>
          <Link href="/" className="bg-white dark:bg-slate-800 px-8 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-brand-600">Start Planning →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map(trip => <TripCard key={trip.id} trip={trip} onDelete={removeTripFromUI} />)}
        </div>
      )}
    </div>
  );
}