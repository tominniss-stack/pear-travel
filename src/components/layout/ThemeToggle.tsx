'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-10 w-10" />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <span className="text-xl transition-transform group-hover:rotate-12">☀️</span>
      ) : (
        <span className="text-xl transition-transform group-hover:-rotate-12">🌙</span>
      )}
    </button>
  );
}