// ─────────────────────────────────────────────────────────────────────────────
// Zustand store — Pear Travel v2
// Single source of truth. This is the definitive version.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { TripIntake, Itinerary, POI, ItineraryEntry, TripStore } from '@/types';
import { recalculateDay } from '@/lib/itinerary/recalc';

// ── SavedTrip type ────────────────────────────────────────────────────────────

export interface SavedTrip {
  id:          string;
  destination: string;
  duration:    number;
  startDate?:  string;
  endDate?:    string;
  budgetGBP:   number;
  createdAt:   string;
  intake:      TripIntake;
  itinerary:   Itinerary;
}

// ── Default intake ────────────────────────────────────────────────────────────

export const defaultIntake: TripIntake = {
  destination:        '',
  destinationPlaceId: undefined,
  bookingMode:        'planning',
  startDate:          undefined,
  endDate:            undefined,
  arrivalTime:        undefined,
  departureTime:      undefined,
  duration:           3,
  accommodation:      '',
  interests:          [],
  budgetGBP:          500,
  diningProfile:      'mid-range',
  anchorPoints:       '',
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTripStore = create<TripStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ── Initial state ───────────────────────────────────────────────────
        intake:          defaultIntake,
        allPOIs:         [],
        selectedPOIs:    [],
        itinerary:       null,
        savedTrips:      [],
        currentTripId:   null,
        
        // ── Currency State ──────────────────────────────────────────────────
        displayCurrency: 'GBP',
        exchangeRate:    1, // Baseline. Will be overwritten by API or Cache

        // ── Weather State ───────────────────────────────────────────────────
        weatherForecast: [],

        // ── Currency Actions ────────────────────────────────────────────────
        toggleCurrency: () =>
          set(
            (state) => ({ displayCurrency: state.displayCurrency === 'GBP' ? 'LOCAL' : 'GBP' }),
            false,
            'toggleCurrency'
          ),

        setExchangeRate: (rate: number) =>
          set({ exchangeRate: rate }, false, 'setExchangeRate'),

        // ── Weather Actions ─────────────────────────────────────────────────
        setWeatherForecast: (forecast: any[]) =>
          set({ weatherForecast: forecast }, false, 'setWeatherForecast'),

        // ── Intake actions ──────────────────────────────────────────────────

        updateIntakeField: (field, value) =>
          set(
            (state) => ({ intake: { ...state.intake, [field]: value } }),
            false,
            `updateIntake/${String(field)}`,
          ),

        setIntake: (intake) =>
          set({ intake }, false, 'setIntake'),

        // ── POI actions ─────────────────────────────────────────────────────

        setAllPOIs: (allPOIs) =>
          set(
            (state) => ({
              allPOIs,
              selectedPOIs: allPOIs.filter((poi) => poi.isFavourited),
            }),
            false,
            'setAllPOIs',
          ),

        toggleFavourite: (placeId) =>
          set(
            (state) => {
              const nextAllPOIs = state.allPOIs.map((poi) =>
                poi.placeId === placeId
                  ? { ...poi, isFavourited: !poi.isFavourited }
                  : poi,
              );

              const updatedPoi = nextAllPOIs.find((poi) => poi.placeId === placeId);
              const poiId = updatedPoi?.id;
              const isNowFavourited = updatedPoi?.isFavourited;

              const nextSelectedPOIs = isNowFavourited && poiId
                ? [
                    ...state.selectedPOIs.filter((poi) => poi.id !== poiId),
                    updatedPoi,
                  ]
                : poiId
                ? state.selectedPOIs.filter((poi) => poi.id !== poiId)
                : state.selectedPOIs;

              return {
                allPOIs:      nextAllPOIs,
                selectedPOIs: nextSelectedPOIs,
              };
            },
            false,
            'toggleFavourite',
          ),

        togglePOI: (poi) =>
          set(
            (state) => {
              const poiId = poi.id;
              const alreadySelected = state.selectedPOIs.some((p) => p.id === poiId);
              const nextSelected = alreadySelected
                ? state.selectedPOIs.filter((p) => p.id !== poiId)
                : [...state.selectedPOIs, poi];

              const poiExists = state.allPOIs.some((p) => p.id === poiId);
              const nextAllPOIs = poiExists
                ? state.allPOIs.map((p) =>
                    p.id === poiId ? { ...p, isFavourited: !alreadySelected } : p,
                  )
                : [...state.allPOIs, { ...poi, isFavourited: !alreadySelected }];

              return {
                selectedPOIs: nextSelected,
                allPOIs:      nextAllPOIs,
              };
            },
            false,
            'togglePOI',
          ),

        // ── Itinerary actions ───────────────────────────────────────────────

        setItinerary: (itinerary) =>
          set({ itinerary }, false, 'setItinerary'),

        // ── Phase 3: Smart Accommodation Updates ──
        updateAccommodation: (dayNumber, entryId, newLocation, newTime, cascade) =>
          set(
            (state) => {
              if (!state.itinerary) return state;

              const nextDays = state.itinerary.days.map((day) => {
                if (day.dayNumber === dayNumber) {
                  const updatedEntries = day.entries.map((e) =>
                    e.id === entryId ? { ...e, locationName: newLocation, time: newTime } : e
                  );
                  return recalculateDay({ ...day, entries: updatedEntries });
                }

                if (cascade && day.dayNumber > dayNumber) {
                  const updatedEntries = day.entries.map((e) => {
                    const isBookend = e.isAccommodation || e.transitMethod === 'Start of Day' || /(accommodation|hotel|airbnb|start of day|return to)/i.test(e.activityDescription || '');
                    const isFlight = /(airport|flight|departure)/i.test(e.activityDescription || '') || /(airport|flight|departure)/i.test(e.locationName || '');

                    if (isBookend && !isFlight) {
                      return { ...e, locationName: newLocation };
                    }
                    return e;
                  });
                  return recalculateDay({ ...day, entries: updatedEntries });
                }

                return day;
              });

              return { itinerary: { ...state.itinerary, days: nextDays } };
            },
            false,
            `updateAccommodation/${dayNumber}/${entryId}`
          ),

        updateEntryTime: (dayNumber, entryId, newTime) =>
          set(
            (state) => {
              if (!state.itinerary) return state;

              const updatedItinerary = {
                ...state.itinerary,
                days: state.itinerary.days.map((day) => {
                  if (day.dayNumber !== dayNumber) return day;

                  const updatedDay = {
                    ...day,
                    entries: day.entries.map((entry) =>
                      entry.id === entryId ? { ...entry, time: newTime, isFixed: true } : entry,
                    ),
                  };

                  return recalculateDay(updatedDay);
                }),
              };

              return { itinerary: updatedItinerary };
            },
            false,
            `updateEntryTime/${dayNumber}/${entryId}`,
          ),

        toggleEntryFixed: (dayNumber, entryId) =>
          set(
            (state) => {
              if (!state.itinerary) return state;

              const updatedItinerary = {
                ...state.itinerary,
                days: state.itinerary.days.map((day) => {
                  if (day.dayNumber !== dayNumber) return day;

                  const updatedDay = {
                    ...day,
                    entries: day.entries.map((entry) =>
                      entry.id === entryId ? { ...entry, isFixed: !entry.isFixed } : entry,
                    ),
                  };

                  return recalculateDay(updatedDay);
                }),
              };

              return { itinerary: updatedItinerary };
            },
            false,
            `toggleEntryFixed/${dayNumber}/${entryId}`,
          ),

        addCustomEntry: (dayNumber, partialEntry) =>
          set(
            (state) => {
              if (!state.itinerary) return state;
              
              const newEntry: ItineraryEntry = {
                id: `custom-${Date.now()}`,
                time: partialEntry.time || undefined,
                locationName: partialEntry.locationName || 'New Activity',
                activityDescription: partialEntry.activityDescription || 'Manually added activity.',
                estimatedCostGBP: partialEntry.estimatedCostGBP || 0,
                isFixed: !!partialEntry.time,
                transitMethod: partialEntry.transitMethod || 'Walking',
                transitNote: partialEntry.transitNote || '15 min',
                isDining: partialEntry.isDining || false,
                googleMapsUrl: partialEntry.googleMapsUrl || '',
                placeId: partialEntry.placeId || '',
                isAccommodation: partialEntry.isAccommodation || false,
              };

              const updatedItinerary = {
                ...state.itinerary,
                days: state.itinerary.days.map((day) => {
                  if (day.dayNumber !== dayNumber) return day;
                  
                  const entries = [...day.entries];
                  
                  if (!newEntry.time) {
                    let insertIdx = entries.findIndex(e => 
                      !e.isAccommodation && e.transitMethod !== 'Start of Day' && !/(Accommodation|Hotel|Airbnb|Start of Day|Return to)/i.test(e.activityDescription || '')
                    );
                    if (insertIdx === -1) insertIdx = Math.min(1, entries.length);
                    entries.splice(insertIdx, 0, newEntry);
                  } else {
                    entries.push(newEntry);
                  }
                  
                  return recalculateDay({ ...day, entries });
                }),
              };

              return { itinerary: updatedItinerary };
            },
            false,
            `addCustomEntry/${dayNumber}`,
          ),

        // ── Phase 4: Mass Add Pipeline (Re-optimization Logic) ──
        pushStagedToItinerary: () =>
          set(
            (state) => {
              // Now acts as a clear-down state after the Re-optimize API call handles the data
              return {
                allPOIs: state.allPOIs.map(p => ({ ...p, isFavourited: false })),
                selectedPOIs: []
              };
            },
            false,
            'pushStagedToItinerary'
          ),

        setCurrentTripId: (id) =>
          set({ currentTripId: id }, false, 'setCurrentTripId'),

        resetStore: () =>
          set(
            {
              intake:          defaultIntake,
              allPOIs:         [],
              selectedPOIs:    [],
              itinerary:       null,
              currentTripId:   null,
              weatherForecast: [],
            },
            false,
            'resetStore',
          ),
      }),
      {
        name: 'pear-travel-v2-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          intake:          state.intake,
          currentTripId:   state.currentTripId,
          savedTrips:      state.savedTrips,
          displayCurrency: state.displayCurrency, 
          exchangeRate:    state.exchangeRate, 
        }),
      },
    ),
    { name: 'PearTravelStore' },
  ),
);

export function useHydratedTripStore<T>(
  selector: (state: TripStore) => T,
): T | undefined {
  const [isHydrated, setIsHydrated] = useState(false);
  const result = useTripStore(selector);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated ? result : undefined;
}