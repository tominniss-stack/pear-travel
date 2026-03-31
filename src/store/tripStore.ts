// ─────────────────────────────────────────────────────────────────────────────
// Zustand store — Pear Travel v3
// Single source of truth. This is the definitive version.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { TripIntake, Itinerary, POI, ItineraryEntry, TripStore, LockedAccommodation, MiscExpense, AestheticPreference } from '@/types';
import { recalculateItinerary } from '@/lib/itinerary/recalc';

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

        // ── Weather & Hydration State ───────────────────────────────────────
        weatherForecast: [],
        pendingPlaceResolutions: {},

        // ── Phase 8 Theme State ─────────────────────────────────────────────
        aestheticPreference: 'CLASSIC' as AestheticPreference,
        useDynamicColors: true,

        // ── V3 Architecture: Optimistic Hydration ───────────────────────────
        applyPendingHydration: () => set(state => {
          if (!state.itinerary || Object.keys(state.pendingPlaceResolutions).length === 0) return state;
          const nextDays = state.itinerary.days.map(day => ({
            ...day,
            entries: day.entries.map(e => {
              const update = state.pendingPlaceResolutions[e.id];
              // Protect user-edited entries from being silently overwritten
              if (update && !e.userModified) return { ...e, ...update };
              return e;
            })
          }));
          return { 
            itinerary: recalculateItinerary({ ...state.itinerary, days: nextDays }, state.intake), 
            pendingPlaceResolutions: {} 
          };
        }, false, 'applyPendingHydration'),

        // ── V3 Architecture: Dynamic Booking Loop ───────────────────────────
        setLockedAccommodation: (acc) => set(state => {
          if (!state.itinerary) return state;
          const filtered = (state.itinerary.lockedAccommodations || []).filter(a => a.placeId !== acc.placeId);
          const newLocked = [...filtered, acc];
          return { itinerary: recalculateItinerary({ ...state.itinerary, lockedAccommodations: newLocked }, state.intake) };
        }, false, 'setLockedAccommodation'),

        removeLockedAccommodation: (placeId) => set(state => {
          if (!state.itinerary) return state;
          const newLocked = (state.itinerary.lockedAccommodations || []).filter(a => a.placeId !== placeId);
          return { itinerary: recalculateItinerary({ ...state.itinerary, lockedAccommodations: newLocked }, state.intake) };
        }, false, 'removeLockedAccommodation'),

        autoHealConflict: (dayNumber, entryId) => set(state => {
          if (!state.itinerary) return state;
          const nextDays = state.itinerary.days.map(day => {
            if (day.dayNumber !== dayNumber) return day;
            const entryIndex = day.entries.findIndex(e => e.id === entryId);
            if (entryIndex <= 0) return day;
            
            const target = day.entries[entryIndex];
            const prev = day.entries[entryIndex - 1];
            
            if (target.conflict?.type === 'overlap') {
              // FIX: Corrected overlapMinutes to conflictMinutes matching the types
              const newDuration = Math.max(15, (prev.durationMinutes || 120) - target.conflict.conflictMinutes);
              const updatedEntries = [...day.entries];
              updatedEntries[entryIndex - 1] = { ...prev, durationMinutes: newDuration };
              return { ...day, entries: updatedEntries };
            }
            return day;
          });
          return { itinerary: recalculateItinerary({ ...state.itinerary, days: nextDays }, state.intake) };
        }, false, 'autoHealConflict'),

        // ── Currency Actions ────────────────────────────────────────────────
        toggleCurrency: () =>
          set(
            (state) => ({ displayCurrency: state.displayCurrency === 'GBP' ? 'LOCAL' : 'GBP' }),
            false,
            'toggleCurrency'
          ),

        setExchangeRate: (rate: number) =>
          set({ exchangeRate: rate }, false, 'setExchangeRate'),

        // ── Theme Actions ───────────────────────────────────────────────────
        setAestheticPreference: (pref: AestheticPreference) =>
          set({ aestheticPreference: pref }, false, 'setAestheticPreference'),

        toggleDynamicColors: () =>
          set((state) => ({ useDynamicColors: !state.useDynamicColors }), false, 'toggleDynamicColors'),

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

// ── Legacy Compatibility: Preserved for SortableItinerary ───────────
        updateAccommodation: (dayNumber: number, entryId: string, newLocation: string, newTime?: string, cascade?: boolean) =>
          set(
            (state) => {
              if (!state.itinerary) return state;

              const nextDays = state.itinerary.days.map((day) => {
                if (day.dayNumber === dayNumber) {
                  const updatedEntries = day.entries.map((e) => {
                    if (e.id === entryId) {
                      return { ...e, locationName: newLocation, time: newTime || e.time, userModified: true };
                    }
                    if (cascade) {
                      const isBookend = !e.isDining && (
                        e.type === 'ACCOMMODATION' ||
                        /(accommodation|hotel|airbnb|start of day|return to)/i.test(e.activityDescription || '') ||
                        /(accommodation|hotel|airbnb|start of day|return to)/i.test(e.locationName || '')
                      );
                      if (isBookend) {
                        return { ...e, locationName: newLocation, userModified: true };
                      }
                    }
                    return e;
                  });
                  return { ...day, entries: updatedEntries };
                }

                if (cascade && day.dayNumber > dayNumber) {
                  const updatedEntries = day.entries.map((e) => {
                    const isBookend = !e.isDining && (
                      e.type === 'ACCOMMODATION' ||
                      /(accommodation|hotel|airbnb|start of day|return to)/i.test(e.activityDescription || '') ||
                      /(accommodation|hotel|airbnb|start of day|return to)/i.test(e.locationName || '')
                    );
                    
                    if (isBookend) {
                      return { ...e, locationName: newLocation, userModified: true };
                    }
                    return e;
                  });
                  return { ...day, entries: updatedEntries };
                }

                return day;
              });

              return { 
                itinerary: recalculateItinerary({ ...state.itinerary, days: nextDays }, state.intake),
                ...(cascade ? { intake: { ...state.intake, accommodation: newLocation } } : {})
              };
            },
            false,
            `updateAccommodation/${dayNumber}/${entryId}`
          ),

        updateEntryTime: (dayNumber, entryId, newTime) =>
          set(
            (state) => {
              if (!state.itinerary) return state;

              const updatedDays = state.itinerary.days.map((day) => {
                if (day.dayNumber !== dayNumber) return day;

                const updatedEntries = day.entries.map((entry) =>
                  entry.id === entryId ? { ...entry, time: newTime, isFixed: true, userModified: true } : entry,
                );

                return { ...day, entries: updatedEntries };
              });

              return { itinerary: recalculateItinerary({ ...state.itinerary, days: updatedDays }, state.intake) };
            },
            false,
            `updateEntryTime/${dayNumber}/${entryId}`,
          ),

        toggleEntryFixed: (dayNumber, entryId) =>
          set(
            (state) => {
              if (!state.itinerary) return state;

              const updatedDays = state.itinerary.days.map((day) => {
                if (day.dayNumber !== dayNumber) return day;

                const updatedEntries = day.entries.map((entry) =>
                  entry.id === entryId ? { ...entry, isFixed: !entry.isFixed, userModified: true } : entry,
                );

                return { ...day, entries: updatedEntries };
              });

              return { itinerary: recalculateItinerary({ ...state.itinerary, days: updatedDays }, state.intake) };
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
                type: partialEntry.type || 'ACTIVITY', 
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
              };

              const updatedDays = state.itinerary.days.map((day) => {
                if (day.dayNumber !== dayNumber) return day;
                
                const entries = [...day.entries];
                
                if (!newEntry.time) {
                  const insertIdx = Math.max(0, entries.length - 1);
                  entries.splice(insertIdx, 0, newEntry);
                } else {
                  entries.push(newEntry);
                }
                
                return { ...day, entries };
              });

              return { itinerary: recalculateItinerary({ ...state.itinerary, days: updatedDays }, state.intake) };
            },
            false,
            `addCustomEntry/${dayNumber}`,
          ),

        // ── Phase 8: Financial Ledger Actions ──
        
        setActualCost: (dayNumber, entryId, cost, documentId) =>
          set(
            (state) => {
              if (!state.itinerary) return state;

              const updatedDays = state.itinerary.days.map((day) => {
                if (day.dayNumber !== dayNumber) return day;

                const updatedEntries = day.entries.map((entry) =>
                  entry.id === entryId 
                    ? { 
                        ...entry, 
                        actualCostGBP: cost, 
                        linkedDocumentId: documentId !== undefined ? documentId : entry.linkedDocumentId 
                      } 
                    : entry
                );

                return { ...day, entries: updatedEntries };
              });

              return { itinerary: { ...state.itinerary, days: updatedDays } };
            },
            false,
            `setActualCost/${dayNumber}/${entryId}`
          ),

        addMiscExpense: (expense) =>
          set(
            (state) => {
              if (!state.itinerary) return state;
              
              const newExpense: MiscExpense = { 
                ...expense, 
                id: `misc-${Date.now()}`
              };
              
              const miscExpenses = [...(state.itinerary.miscExpenses || []), newExpense];
              return { itinerary: { ...state.itinerary, miscExpenses } };
            },
            false,
            'addMiscExpense'
          ),

        removeMiscExpense: (id) =>
          set(
            (state) => {
              if (!state.itinerary) return state;
              
              const miscExpenses = (state.itinerary.miscExpenses || []).filter(e => e.id !== id);
              return { itinerary: { ...state.itinerary, miscExpenses } };
            },
            false,
            'removeMiscExpense'
          ),
          
        // ── End Financial Ledger Actions ──

        // ── Phase 4: Mass Add Pipeline (Re-optimization Logic) ──
        pushStagedToItinerary: () =>
          set(
            (state) => {
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
              intake:                  defaultIntake,
              allPOIs:                 [],
              selectedPOIs:            [],
              itinerary:               null,
              currentTripId:           null,
              weatherForecast:         [],
              pendingPlaceResolutions: {}, 
            },
            false,
            'resetStore',
          ),
      }),
      {
        name: 'pear-travel-v3-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          intake:              state.intake,
          currentTripId:       state.currentTripId,
          savedTrips:          state.savedTrips,
          displayCurrency:     state.displayCurrency, 
          exchangeRate:        state.exchangeRate, 
          aestheticPreference: state.aestheticPreference, 
          useDynamicColors:    state.useDynamicColors,    
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