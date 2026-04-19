'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { addDays, format } from 'date-fns';
import { lockTripDates } from '@/app/actions/trip';
import { generateICS } from '@/lib/exportCalendar';
import type { Itinerary } from '@/types';
import type { ClientTripProps } from './ItineraryDisplay';

// eslint-disable-next-line @next/next/no-server-actions-in-client-components
export default function CalendarExportModal({ 
  trip, 
  itinerary, 
  isOpen, 
  onClose 
}: { 
  trip: ClientTripProps; 
  itinerary: Itinerary; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const router = useRouter();
  
  // Safely parse database ISO string to local YYYY-MM-DD to avoid timezone shift
  const [startDateStr, setStartDateStr] = useState(() => {
    if (!trip.startDate) return '';
    const d = new Date(trip.startDate);
    return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), 'yyyy-MM-dd');
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted) return null;

  const downloadFile = (dateToUse: string) => {
    const icsContent = generateICS(itinerary, dateToUse, trip.destination);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${trip.destination.replace(/\s+/g, '_')}_Itinerary.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateStr) {
      setError("Please select a start date.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // If the trip already has a start date, just download it
    if (trip.startDate) {
      downloadFile(trip.startDate);
      setIsLoading(false);
      onClose();
      return;
    }

    // Otherwise, calculate the end date and lock it in the DB
    const startObj = new Date(startDateStr);
    const endObj = addDays(startObj, trip.duration - 1);
    
    try {
      await lockTripDates(trip.id, startObj.toISOString(), endObj.toISOString());
      downloadFile(startObj.toISOString());
      router.refresh(); // Refresh the page to update the UI (Hero Dates, etc)
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm !bg-white dark:!bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center animate-in fade-in zoom-in-95 duration-200 !text-slate-900 dark:!text-white">
        
        <span className="text-5xl mb-4 block drop-shadow-md">📅</span>
        
        {!trip.startDate ? (
          <>
            <h3 className="text-xl font-black mb-2 !text-slate-900 dark:!text-white">Lock Your Dates</h3>
            <p className="text-sm font-medium !text-slate-500 mb-6">
              When does Day 1 begin? We need to lock your dates to generate the calendar file.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-black mb-2 !text-slate-900 dark:!text-white">Export Calendar</h3>
            <p className="text-sm font-medium !text-slate-500 mb-6">
              Your dates are set! Download your itinerary to Apple, Google, or Outlook Calendar.
            </p>
          </>
        )}

        <form onSubmit={handleExport} className="flex flex-col gap-4">
          
          {!trip.startDate && (
            <div className="text-left">
              <label className="block text-[10px] font-bold !text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Trip Start Date</label>
              <input 
                type="date" 
                required
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full px-4 py-3.5 !bg-slate-50 dark:!bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-bold !text-slate-900 dark:!text-white transition-all cursor-pointer"
              />
            </div>
          )}

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3.5 !bg-slate-100 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300 font-bold rounded-xl hover:!bg-slate-200 dark:hover:!bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex-[2] py-3.5 !bg-brand-500 !text-white font-bold rounded-xl shadow-md hover:!bg-brand-600 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {isLoading ? '...' : (trip.startDate ? 'Download .ICS' : 'Lock & Download')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}