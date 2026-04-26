'use client';

import { useState } from 'react';
import { useTripStore } from '@/store/tripStore';

export default function ExportPdfButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentTripId, savedTrips, itinerary } = useTripStore();

  const handleExport = async () => {
    const trip = savedTrips.find(t => t.id === currentTripId);
    if (!trip || !itinerary) {
      alert("Missing trip data to export.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripState: trip,
          itineraryState: itinerary
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pear_Travel_${trip.destination.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      // The `print:hidden` class ensures this button doesn't appear on the actual PDF
      className="
        print:hidden
        inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 
        px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 
        transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      <svg 
        className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        strokeWidth={2}
      >
        {isGenerating ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        )}
      </svg>
      {isGenerating ? 'Generating PDF...' : 'Export PDF'}
    </button>
  );
}