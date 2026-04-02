import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Caveat, Special_Elite } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import GlobalNav from "@/components/layout/GlobalNav";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair' });
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${caveat.variable} ${specialElite.variable} font-sans bg-slate-50 text-slate-900 antialiased selection:bg-brand-500/30 min-h-screen flex flex-col`}>
        <ThemeProvider>
          <Providers>
            <GlobalNav />
            <main className="flex-1 flex flex-col relative z-0">
              {children}
            </main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}