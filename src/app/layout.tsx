// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import GlobalNav from '@/components/layout/GlobalNav';
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
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          {/* Our smart navigation component that hides itself on /login */}
          <GlobalNav />
          
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}