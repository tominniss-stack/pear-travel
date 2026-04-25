'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppearancePopover } from '@/components/shared/AppearancePopover';
import { AppShellThemeToggle } from '@/components/shared/AppShellThemeToggle';

export default function GlobalNav() {
  const pathname = usePathname();
  const isItineraryPage = pathname?.startsWith('/itinerary/');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (pathname === '/login') return null;

  return (
    <header
      className={`print:hidden sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
          <span className="text-xl transition-transform group-hover:scale-105 group-hover:-rotate-6">🍐</span>
          <span className="font-medium text-lg tracking-tight hidden sm:inline-block text-zinc-900 dark:text-white">
            Pear Travel
          </span>
        </Link>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3 sm:gap-5">

          {/* Nav links */}
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className={`text-sm font-medium transition-colors ${
                pathname === '/settings'
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Settings
            </Link>
          </nav>

          {/* New Trip CTA */}
          <Link
            href="/generate"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-full hover:bg-brand-700 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </Link>

          {/* Theme Controls */}
          <div className="pl-2 border-l border-zinc-200 dark:border-zinc-800">
            {isItineraryPage ? <AppearancePopover /> : <AppShellThemeToggle />}
          </div>
        </div>
      </div>
    </header>
  );
}
