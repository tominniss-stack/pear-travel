// ─────────────────────────────────────────────────────────────────────────────
// Zustand store — Travel Profile preferences
// Persisted to localStorage so settings survive page reloads.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DailyPacing = 'relaxed' | 'moderate' | 'intensive';
export type TransportPreference = 'walk' | 'public-transport' | 'private';
export type DiningStyle = 'gastronomy' | 'convenience';
export type StartTime = string; // e.g. '09:00'

export interface TravelProfile {
  dailyPacing: DailyPacing;
  transportPreference: TransportPreference;
  diningStyle: DiningStyle;
  idealStartTime: StartTime;
  hasCompletedOnboarding: boolean;
}

interface ProfileStore extends TravelProfile {
  updateProfile: (partial: Partial<TravelProfile>) => void;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultProfile: TravelProfile = {
  dailyPacing: 'moderate',
  transportPreference: 'public-transport',
  diningStyle: 'convenience',
  idealStartTime: '09:30',
  hasCompletedOnboarding: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      ...defaultProfile,

      updateProfile: (partial) =>
        set((state) => ({ ...state, ...partial })),
    }),
    {
      name: 'pear-travel-profile',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ── Hydration Hook ────────────────────────────────────────────────────────────
// Prevents SSR/hydration mismatch by waiting for localStorage to load.

export function useHydratedProfileStore<T>(
  selector: (state: ProfileStore) => T,
): T | undefined {
  const [isHydrated, setIsHydrated] = useState(false);
  const result = useProfileStore(selector);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated ? result : undefined;
}
