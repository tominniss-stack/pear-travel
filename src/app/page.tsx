'use client';

import { useEffect } from 'react';
import TripIntakeForm from '@/components/intake/TripIntakeForm';
import { useTripStore } from '@/store/tripStore';

export default function Home() {
  const resetStore = useTripStore((state) => state.resetStore);

  // Reset the store when landing on the home page to prevent "ghost" trip submissions
  useEffect(() => {
    resetStore();
  }, [resetStore]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 py-10 sm:py-16">
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Plan your trip <span className="text-emerald-600 dark:text-emerald-400">faster.</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium">
            Enter your destination below to generate a custom V3 itinerary.
          </p>
        </header>

        <div className="w-full rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl shadow-slate-200/50 dark:shadow-none sm:p-12">
          <TripIntakeForm />
        </div>
      </main>
    </div>
  );
}