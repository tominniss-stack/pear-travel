import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/layout/ThemeToggle';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pear Travel | Perfectly Routed',
  description: 'AI-powered travel itineraries that respect your time and budget.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The Google Maps Script: 
          Uses NEXT_PUBLIC_ prefix so the browser can access the key.
          strategy="beforeInteractive" ensures it loads before your form tries to use it.
        */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Global Pear Travel Navigation */}
          <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🍐</span>
                <span className="font-bold text-xl tracking-tight text-brand-600 dark:text-brand-400">
                  Pear Travel
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex gap-6 text-sm font-medium">
                  <a href="/dashboard" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    My Trips
                  </a>
                  <a href="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    New Plan
                  </a>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </nav>
          
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}