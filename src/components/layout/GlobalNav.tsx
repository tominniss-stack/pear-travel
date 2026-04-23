'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { AppearancePopover } from "@/components/shared/AppearancePopover";

export default function GlobalNav() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <nav className="print:hidden border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        <Link href="/" className="flex items-center gap-2 group outline-none">
          <span className="text-2xl group-hover:scale-110 transition-transform duration-300" aria-hidden="true">🍐</span>
          <span className="font-bold text-xl tracking-tight text-brand-600 dark:text-brand-400">
            Pear Travel
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex gap-4 sm:gap-6 text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
            <Link 
              href="/dashboard" 
              className={`transition-colors ${pathname === '/dashboard' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-brand-600 dark:hover:text-brand-400'}`}
            >
              My Trips
            </Link>
            <Link 
              href="/" 
              className={`transition-colors ${pathname === '/' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-brand-600 dark:hover:text-brand-400'}`}
            >
              New Plan
            </Link>
            <Link 
              href="/settings" 
              className={`transition-colors ${pathname === '/settings' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-brand-600 dark:hover:text-brand-400'}`}
            >
              Settings
            </Link>
          </div>
          <div className="pl-2 border-l border-slate-200 dark:border-slate-800 ml-2">
            <AppearancePopover />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}