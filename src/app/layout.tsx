import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Caveat, Special_Elite } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";
import GlobalNav from "@/components/layout/GlobalNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OnboardingGuard } from "@/components/OnboardingGuard";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '700', '900'],
  style: ['normal', 'italic']
});
const caveat = Caveat({ subsets: ["latin"], variable: '--font-caveat', display: 'swap' });
const specialElite = Special_Elite({ weight: "400", subsets: ["latin"], variable: '--font-special-elite', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: "Pear Travel",
  description: "Curated, aesthetic itineraries for the modern traveler.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: '/icon.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${caveat.variable} ${specialElite.variable}`}>
      <body className="font-sans bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 antialiased selection:bg-brand-500/30 min-h-screen flex flex-col transition-colors duration-300">
        <ThemeProvider>
          <Providers>
            <OnboardingGuard>
              <GlobalNav />
              <main className="flex-1 flex flex-col relative z-0">
                {children}
              </main>
            </OnboardingGuard>
          </Providers>
        </ThemeProvider>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}