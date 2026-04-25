'use client';

import { useEffect } from 'react';
import TripIntakeForm from '@/components/intake/TripIntakeForm';
import { useTripStore } from '@/store/tripStore';

export default function Home() {
  const resetStore = useTripStore((state) => state.resetStore);

  // Safely reset the intake fields when landing on the home page
  // to prevent "ghost" trip submissions from previous sessions.
  useEffect(() => {
    resetStore();
  }, [resetStore]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 flex flex-col items-center">
      {/* Editorial Header */}
      <div className="w-full max-w-2xl text-center mb-10 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-medium text-zinc-900 dark:text-white mb-3 sm:mb-4">
          Where are we going?
        </h1>
        <p className="text-zinc-500 text-base sm:text-lg">
          Give us the details, and we&apos;ll craft the perfect itinerary.
        </p>
      </div>

      {/* Form — no box, no shadow, just space */}
      <div className="w-full max-w-2xl">
        <TripIntakeForm />
      </div>
    </div>
  );
}
