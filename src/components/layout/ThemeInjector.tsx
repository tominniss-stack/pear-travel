'use client';

import { useEffect } from 'react';
import { useTripStore } from '@/store/tripStore';
import { getPaletteByVibe } from '@/lib/themeColors';

export default function ThemeInjector() {
  const { itinerary, useDynamicColors } = useTripStore();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // If toggled off or no vibe is set, revert to default
    if (!useDynamicColors || !itinerary?.themeVibe) {
      const defaultPalette = getPaletteByVibe('PEAR_DEFAULT');
      Object.entries(defaultPalette).forEach(([weight, rgb]) => {
        root.style.setProperty(`--brand-${weight}`, rgb);
      });
      return;
    }

    // Apply the Destination-Adaptive Vibe
    const palette = getPaletteByVibe(itinerary.themeVibe);
    Object.entries(palette).forEach(([weight, rgb]) => {
      root.style.setProperty(`--brand-${weight}`, rgb);
    });

    // Cleanup: Restore default when unmounting (leaving the trip view)
    return () => {
      const defaultPalette = getPaletteByVibe('PEAR_DEFAULT');
      Object.entries(defaultPalette).forEach(([weight, rgb]) => {
        root.style.setProperty(`--brand-${weight}`, rgb);
      });
    };
  }, [itinerary?.themeVibe, useDynamicColors]);

  return null;
}