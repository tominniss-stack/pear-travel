'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function GlobalNav() {
  const pathname = usePathname();

  // Hide the navigation entirely on the login screen
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="print:hidden border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">🍐</span>
          <span className="font-bold text-xl tracking-tight text-brand-600 dark:text-brand-400">
            Pear Travel
          </span>
        </Link>

        {/* Links & Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm font-bold uppercase tracking-wider">
            <Link 
              href="/dashboard" 
              className="text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              My Trips
            </Link>
            <Link 
              href="/" 
              className="text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              New Plan
            </Link>
            {/* We will add the "Settings" link right here in Step 2 */}
          </div>
          <ThemeToggle />
        </div>

      </div>
    </nav>
  );
}