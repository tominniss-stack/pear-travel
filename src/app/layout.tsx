import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers'; // Import the bridge we just built
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
        {/* The Providers wrapper allows the whole app to see the Auth/Theme state */}
        <Providers>
          <GlobalNav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}