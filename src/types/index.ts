// ── Travel Profile (mirrors profileStore types) ───────────────────────────────
export type DailyPacing = 'relaxed' | 'moderate' | 'intensive';
export type TransportPreference = 'walk' | 'public-transport' | 'private';
export type DiningStyle = 'gastronomy' | 'convenience';

export interface TravelProfile {
  dailyPacing: DailyPacing;
  transportPreference: TransportPreference;
  diningStyle: DiningStyle;
  idealStartTime: string; // e.g. '09:00'
}

// ── API Payload ───────────────────────────────────────────────────────────────
export interface GeneratePayload {
  intake: TripIntake;
  selectedPOIs: POI[];
  travelProfile?: TravelProfile;
}

export type Interest = 'History' | 'Food & Drink' | 'Art & Culture' | 'Off the Beaten Path' | 'Nightlife' | 'Architecture' | 'Nature & Parks' | 'Shopping' | 'Music & Theatre' | 'Sport';
export type DiningProfile = 'packed-lunch' | 'budget' | 'mid-range' | 'fine-dining';
export type BookingMode = 'booked' | 'planning';
export type PrimaryTransitMode = 'Flight' | 'Train' | 'Car / Other' | 'Not Sure';

export type EntryType = 'ACTIVITY' | 'TRAVEL' | 'ACCOMMODATION' | 'REST_STOP';
export type AestheticPreference = 'CLASSIC' | 'EDITORIAL' | 'NOTEBOOK' | 'TERMINAL' | 'CONCIERGE';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TransitDetails {
  mode: PrimaryTransitMode;
  outbound?: { time: string; reference?: string; station?: string; };
  return?: { time: string; reference?: string; station?: string; };
}

export interface TripIntake {
  destination: string;
  destinationPlaceId?: string;
  defaultOriginCoords?: LatLng; 
  bookingMode: BookingMode;
  startDate?: string;   
  endDate?: string;   
  transitDetails?: TransitDetails;
  duration: number;
  accommodation: string;   
  interests: Interest[];
  budgetGBP: number;
  diningProfile: DiningProfile;
  anchorPoints: string;    
}

export interface LockedAccommodation {
  placeId: string;
  locationName: string;
  checkInDay: number;
  checkOutDay: number; 
}

export interface ScheduleConflict {
  type: 'overlap' | 'impossible_transit';
  conflictMinutes: number; // REFINED: Semantically accurate for both types
  message: string;
}

export interface POI {
  id: string;    
  placeId: string;
  name: string;
  address: string;
  category: string;
  rating?: number;
  totalRatings?: number;
  summary: string;
  photoReference?: string;    
  estimatedCostGBP: number;
  avgDurationMinutes: number;
  isFavourited: boolean;
  googleMapsUrl: string;    
  openingHours?: { openNow: boolean; weekdayDescriptions: string[]; };
}

export type TransitMethod = 'Walking' | 'Tube' | 'Bus' | 'Metro' | 'Tram' | 'Taxi / Rideshare' | 'Train' | 'Ferry' | 'Cycling' | 'Start of Day';

// ── Minified Timeline Item (token-efficient AI payload) ──────────────────────
export interface MinifiedTimelineItem {
  id: string;
  title: string;
  startTime: string | undefined;
  endTime: string | undefined;
  location: {
    name: string;
    placeId?: string;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
  };
}
// ─────────────────────────────────────────────────────────────────────────────

// ── NEW: Financial Ledger Types ──
export type ExpenseCategory = 'Transit' | 'Dining' | 'Activities' | 'Accommodation' | 'Shopping' | 'Other';

export interface MiscExpense {
  id: string;
  title: string;
  amountGBP: number;
  category: ExpenseCategory;
  date?: string;
  linkedDocumentId?: string; // Standardized to match ItineraryEntry
  isSunkCost?: boolean;      // True = Flights/Hotels, False = Daily Spending
}
// ─────────────────────────────────

export interface ItineraryEntry {
  id: string;
  type: EntryType;
  time?: string;
  locationName: string;
  activityDescription: string;
  transitMethod: TransitMethod;
  transitNote?: string;
  estimatedCostGBP: number;
  actualCostGBP?: number; // ── NEW FIELD ──
  googleMapsUrl: string;
  placeId?: string;
  isDining: boolean;
  isFixed?: boolean;
  userModified?: boolean;
  durationMinutes?: number;
  openingHours?: { open: string; close: string };
  timeWarning?: string;
  linkedDocumentId?: string;
  conflict?: ScheduleConflict;
  requiresReschedule?: boolean; // ── Clash Interceptor: item was ejected from timeline due to a fixed event conflict ──
}

// ── Regenerate Day API Response ───────────────────────────────────────────────
export interface RegenerateDayResponse {
  day: DayItinerary;
  ejectedItems?: MinifiedTimelineItem[]; // Present when pinned items were removed to accommodate a fixed external event
}

export interface DayItinerary {
  dayNumber: number;
  date?: string;
  entries: ItineraryEntry[];
  estimatedDailySpendGBP: number;
}

export interface CityEssentials {
  destination: string;
  language?: string;
  airportTransit: string;
  tippingEtiquette: string;
  transportCardAdvice: string;
  currency: string;
  emergencyNumbers: string;
  usefulPhrases?: { phrase: string; translation: string }[];
  plugType?: string;
  tapWater?: string;
  apps?: string[];
  contextualRisk?: string;
  localCustoms?: string[];
  englishProficiency?: string; 
  neighbourhoodRecommendations?: { name: string; vibe: string; reason: string; }[];
}

// ── Day Override (per-day pacing / start-time / fixed events) ────────────────
export interface DayOverride {
  pacing?: DailyPacing;
  startTime?: string;          // e.g. '08:00'
  hardcodedEvents?: string;    // free-text, e.g. "Dinner at Dishoom at 20:00"
}
// ─────────────────────────────────────────────────────────────────────────────

export interface Itinerary {
  id: string;
  themeVibe?: string;
  days: DayItinerary[];
  unscheduledOptions?: ItineraryEntry[];
  essentials?: CityEssentials;
  miscExpenses?: MiscExpense[]; // ── NEW FIELD ──
  totalEstimatedCostGBP: number;
  generatedAt: string;
  lockedAccommodations?: LockedAccommodation[];
  dayOverrides?: Record<number, DayOverride>; // key = dayNumber
}

// ... (keep the rest of your types exactly as they are)

export interface TripStore {
  intake: TripIntake;
  allPOIs: POI[];       
  selectedPOIs: POI[];
  itinerary: Itinerary | null;
  savedTrips: any[];       
  currentTripId: string | null; 
  displayCurrency: 'GBP' | 'LOCAL';
  exchangeRate: number;
  weatherForecast: any[];
  pendingPlaceResolutions: Record<string, Partial<ItineraryEntry>>; 

  // ── PHASE 8: THEME ENGINE TYPES ──
  aestheticPreference: AestheticPreference;
  useDynamicColors: boolean;
  setAestheticPreference: (pref: AestheticPreference) => void;
  toggleDynamicColors: () => void;
  // ─────────────────────────────────

  applyPendingHydration: () => void;
  setLockedAccommodation: (acc: LockedAccommodation) => void;
  removeLockedAccommodation: (placeId: string) => void;
  autoHealConflict: (dayNumber: number, entryId: string) => void;
  updateAccommodation: (dayNumber: number, entryId: string, newLocation: string, newTime?: string, cascade?: boolean) => void;
  updateIntakeField: <K extends keyof TripIntake>(field: K, value: TripIntake[K]) => void;
  setIntake: (intake: TripIntake) => void;
  setAllPOIs: (pois: POI[]) => void;
  toggleFavourite: (placeId: string) => void;
  togglePOI: (poi: POI) => void;
  setItinerary: (itinerary: Itinerary | null) => void;
  setCurrentTripId: (id: string | null) => void;
  toggleCurrency: () => void;
  setExchangeRate: (rate: number) => void;
  setWeatherForecast: (forecast: any[]) => void;
  updateEntryTime: (dayNumber: number, entryId: string, newTime: string) => void;
  toggleEntryFixed: (dayNumber: number, entryId: string) => void;
  addCustomEntry: (dayNumber: number, entry: Partial<ItineraryEntry>) => void;
  pushStagedToItinerary: () => void;
  resetStore: () => void;
  
  setActualCost: (dayNumber: number, entryId: string, cost: number | undefined, documentId?: string) => void;
  addMiscExpense: (expense: Omit<MiscExpense, 'id'>) => void;
  removeMiscExpense: (id: string) => void;
}