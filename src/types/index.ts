// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript interfaces — Pear Travel v2
// ─────────────────────────────────────────────────────────────────────────────

export type Interest =
  | 'History'
  | 'Food & Drink'
  | 'Art & Culture'
  | 'Off the Beaten Path'
  | 'Nightlife'
  | 'Architecture'
  | 'Nature & Parks'
  | 'Shopping'
  | 'Music & Theatre'
  | 'Sport';

export type DiningProfile =
  | 'packed-lunch'
  | 'budget'
  | 'mid-range'
  | 'fine-dining';

export type BookingMode = 'booked' | 'planning';

export type PrimaryTransitMode = 'Flight' | 'Train' | 'Car / Other' | 'Not Sure';

// ── NEW: Flexible Transit Details ──────────────────────────────────────────────
export interface TransitDetails {
  mode: PrimaryTransitMode;
  outbound?: {
    time: string;           // The time they arrive at the destination
    reference?: string;     // e.g., Flight Number 'BA 314'
    station?: string;       // e.g., 'LHR' or 'Kings Cross'
  };
  return?: {
    time: string;           // The time they depart the destination
    reference?: string; 
    station?: string;
  };
}

// ── Trip Intake ───────────────────────────────────────────────────────────────

export interface TripIntake {
  destination:         string;
  destinationPlaceId?: string;
  bookingMode:         BookingMode;
  startDate?:          string;   
  endDate?:            string;   
  transitDetails?:     TransitDetails; // Replaces arrivalTime/departureTime
  duration:            number;
  accommodation:       string;   
  interests:           Interest[];
  budgetGBP:           number;
  diningProfile:       DiningProfile;
  anchorPoints:        string;    
}

// ── Points of Interest (Discovery Phase) ──────────────────────────────────────

export interface POI {
  id:                  string;    
  placeId:             string;
  name:                string;
  address:             string;
  category:            string;
  rating?:             number;
  totalRatings?:       number;
  summary:             string;
  photoReference?:     string;    
  estimatedCostGBP:    number;
  avgDurationMinutes:  number;
  isFavourited:        boolean;
  googleMapsUrl:       string;    
  openingHours?: {
    openNow:           boolean;
    weekdayDescriptions: string[];
  };
}

// ── Itinerary ─────────────────────────────────────────────────────────────────

export type TransitMethod =
  | 'Walking' | 'Tube' | 'Bus' | 'Metro' | 'Tram' 
  | 'Taxi / Rideshare' | 'Train' | 'Ferry' | 'Cycling' | 'Start of Day';

export interface ItineraryEntry {
  id:                  string;    
  time?:               string;    // Optional: allow blank times for manual adds/parking lot
  locationName:        string;
  activityDescription: string;
  transitMethod:       TransitMethod;
  transitNote?:        string;
  estimatedCostGBP:    number;
  googleMapsUrl:       string;
  placeId?:            string;
  isDining:            boolean;
  isFixed?:            boolean;   
  openingHours?:       { open: string; close: string }; // e.g., { open: "09:00", close: "17:00" }
  timeWarning?:        string; // Used by recalc.ts to flag "Closes at 17:00"
  isAccommodation?:    boolean;
  linkedDocumentId?:   string; // New: Link a specific activity/flight to a Filing Cabinet PDF
}

export interface DayItinerary {
  dayNumber:               number;
  date?:                   string;
  entries:                 ItineraryEntry[];
  estimatedDailySpendGBP:  number;
}

export interface CityEssentials {
  destination:          string;
  airportTransit:       string;
  tippingEtiquette:     string;
  transportCardAdvice:  string;
  currency:             string;
  emergencyNumbers:     string;
  usefulPhrases?:       { phrase: string; translation: string }[];
  // ── Holiday Concierge Data ──
  plugType?:            string;
  tapWater?:            string;
  apps?:                string[];
  contextualRisk?:      string;
  localCustoms?:        string[];
  // ── NEW: Neighbourhood Matchmaker ──
  neighbourhoodRecommendations?: {
    name:   string;
    vibe:   string; // e.g., "£ • Hostels & Street Art"
    reason: string; // e.g., "Close to your chosen nightlife POIs."
  }[];
}

export interface Itinerary {
  id:                     string;
  days:                   DayItinerary[];
  unscheduledOptions?:    ItineraryEntry[];  
  essentials?:            CityEssentials;
  totalEstimatedCostGBP:  number;
  generatedAt:            string;
}

// ── Zustand Store State ───────────────────────────────────────────────────────

export interface TripStore {
  updateAccommodation: (dayNumber: number, entryId: string, newLocation: string, newTime: string, cascade: boolean) => void;
  intake:           TripIntake;
  allPOIs:          POI[];       
  selectedPOIs:     POI[];
  itinerary:        Itinerary | null;
  savedTrips:       any[];       
  currentTripId:    string | null; 
  displayCurrency:  'GBP' | 'LOCAL';
  exchangeRate:     number;
  toggleCurrency:   () => void;
  setExchangeRate:  (rate: number) => void;
  weatherForecast:  any[];
  setWeatherForecast: (forecast: any[]) => void;
  
  // Intake Actions
  updateIntakeField: <K extends keyof TripIntake>(field: K, value: TripIntake[K]) => void;
  setIntake:        (intake: TripIntake) => void;
  
  // POI Actions
  setAllPOIs:       (pois: POI[]) => void;
  toggleFavourite:  (placeId: string) => void;
  togglePOI:        (poi: POI) => void;
  
  // Itinerary Actions
  setItinerary:     (itinerary: Itinerary | null) => void;
  setCurrentTripId: (id: string | null) => void;
  
  // Timeline specific actions added based on editor cleanup
  updateEntryTime:  (dayNumber: number, entryId: string, newTime: string) => void;
  toggleEntryFixed: (dayNumber: number, entryId: string) => void;
  addCustomEntry:   (dayNumber: number, entry: Partial<ItineraryEntry>) => void;
  pushStagedToItinerary: () => void;
  
  resetStore:       () => void;
}