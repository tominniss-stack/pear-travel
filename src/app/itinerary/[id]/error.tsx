'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
      <div className="text-6xl">😕</div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">We couldn't load your itinerary</h1>
      <p className="text-slate-600 dark:text-slate-300 max-w-md text-center">
        This is usually a temporary issue. Try refreshing, or return to your dashboard.
      </p>
      {error.digest && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Error ID: {error.digest}
        </span>
      )}
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl px-6 py-3 font-bold"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="border-2 border-slate-900 text-slate-900 dark:border-white dark:text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center"
        >
          My Trips
        </Link>
      </div>
    </div>
  );
}
