'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/ThemeProvider';

/**
 * Providers acts as the bridge between Server and Client components.
 * It houses all Context Providers (Auth, Theme, etc.) in a single
 * Client-side boundary so they can be safely used in the root layout.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}