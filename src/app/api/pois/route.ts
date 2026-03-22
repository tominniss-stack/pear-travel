import { NextRequest, NextResponse } from 'next/server';
import type { Interest, POI } from '@/types';

interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: {
      open:  { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }[];
    weekdayDescriptions?: string[];
  };
  photos?: { name: string; widthPx: number; heightPx: number }[];
  editorialSummary?: { text: string; languageCode: string };
  websiteUri?: string;
  nationalPhoneNumber?: string;
}

interface GooglePlacesResponse {
  places: GooglePlace[];
}

const INTEREST_QUERIES: Record<Interest, string[]> = {
  'History':             ['historical sites', 'museums', 'ancient monuments'],
  'Food & Drink':        ['top rated restaurants', 'local food markets', 'wine bars'],
  'Art & Culture':       ['art galleries', 'contemporary art museums', 'cultural centres'],
  'Off the Beaten Path': ['hidden gems', 'local neighbourhood attractions', 'unusual sights'],
  'Nightlife':           ['cocktail bars', 'live music venues', 'jazz clubs'],
  'Architecture':        ['architectural landmarks', 'iconic buildings', 'cathedrals'],
  'Nature & Parks':      ['parks and gardens', 'nature reserves', 'botanical gardens'],
  'Shopping':            ['markets', 'independent shops', 'shopping districts'],
  'Music & Theatre':     ['theatres', 'concert halls', 'opera houses'],
  'Sport':               ['stadiums', 'sports venues', 'arenas'],
};

const PRICE_LEVEL_TO_GBP: Record<string, number> = {
  PRICE_LEVEL_FREE:         0,
  PRICE_LEVEL_INEXPENSIVE:  8,
  PRICE_LEVEL_MODERATE:     20,
  PRICE_LEVEL_EXPENSIVE:    45,
  PRICE_LEVEL_VERY_EXPENSIVE: 90,
};

function estimateDurationMinutes(types: string[]): number {
  const durationMap: Record<string, number> = {
    museum: 120, art_gallery: 90, church: 45, cathedral: 60, park: 90, zoo: 180,
    amusement_park: 240, aquarium: 120, stadium: 150, movie_theater: 150,
    night_club: 180, bar: 90, restaurant: 75, cafe: 45, shopping_mall: 120,
    market: 60, tourist_attraction: 90, natural_feature: 60, library: 60,
    university: 45, historic_site: 60,
  };
  for (const type of types) { if (type in durationMap) return durationMap[type]; }
  return 60;
}

function deriveCategory(types: string[]): string {
  const categoryMap: Record<string, string> = {
    museum: 'Museum', art_gallery: 'Art Gallery', church: 'Place of Worship',
    cathedral: 'Cathedral', park: 'Park & Gardens', zoo: 'Zoo',
    amusement_park: 'Amusement Park', aquarium: 'Aquarium', stadium: 'Stadium',
    movie_theater: 'Cinema', night_club: 'Nightlife', bar: 'Bar',
    restaurant: 'Restaurant', cafe: 'Café', shopping_mall: 'Shopping',
    market: 'Market', tourist_attraction: 'Tourist Attraction',
    natural_feature: 'Nature', library: 'Library', historic_site: 'Historic Site',
    lodging: 'Accommodation', spa: 'Spa & Wellness',
  };
  for (const type of types) { if (type in categoryMap) return categoryMap[type]; }
  return 'Point of Interest';
}

function formatOpeningHours(raw: GooglePlace['regularOpeningHours']) {
  if (!raw) return undefined;
  return {
    openNow: !!raw.openNow,
    weekdayDescriptions: raw.weekdayDescriptions ?? [],
  };
}

// Updated to use search query + location for better Map accuracy
function buildGoogleMapsUrl(name: string, lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${lat},${lng}`;
}

function buildPhotoUrl(photoName: string): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${apiKey}`;
}

function buildFallbackSummary(name: string, category: string, destination: string): string {
  return `A highly-rated ${category.toLowerCase()} in ${destination}. A must-visit for anyone exploring the city.`;
}

function mapGooglePlaceToPOI(place: GooglePlace, destination: string): POI {
  const name     = place.displayName?.text ?? 'Unknown Location';
  const types    = place.types ?? [];
  const lat      = place.location?.latitude  ?? 0;
  const lng      = place.location?.longitude ?? 0;
  const category = deriveCategory(types);

  const estimatedCostGBP = place.priceLevel !== undefined ? (PRICE_LEVEL_TO_GBP[place.priceLevel] ?? 10) : 10;
  const summary = place.editorialSummary?.text ?? buildFallbackSummary(name, category, destination);
  const photoReference =
    place.photos && place.photos.length > 0 && place.photos[0]?.name
      ? buildPhotoUrl(place.photos[0].name)
      : undefined;

  return {
    placeId:            place.id,
    id:                 place.id, // Critical: Mirrors placeId for dnd-kit compatibility
    name,
    address:            place.formattedAddress ?? destination,
    category,
    summary,
    estimatedCostGBP,
    avgDurationMinutes: estimateDurationMinutes(types),
    rating:             place.rating,
    totalRatings:       place.userRatingCount,
    openingHours:       formatOpeningHours(place.regularOpeningHours),
    photoReference,
    googleMapsUrl:      buildGoogleMapsUrl(name, lat, lng),
    isFavourited:       false,
  };
}

async function fetchPlacesForQuery(query: string, destination: string, apiKey: string): Promise<GooglePlace[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   apiKey,
        'X-Goog-FieldMask': [
          'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
          'places.rating', 'places.userRatingCount', 'places.priceLevel', 'places.types',
          'places.regularOpeningHours', 'places.photos', 'places.editorialSummary',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery:      `${query} in ${destination}`,
        languageCode:   'en-GB',
        maxResultCount: 5,
        minRating:      3.8,
      }),
    });

  if (!response.ok) return [];
  const data: GooglePlacesResponse = await response.json();
  return data.places ?? [];
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key missing' }, { status: 500 });

    const body = await request.json();
    const { destination, interests } = body as { destination: string; interests: Interest[]; };

    const queries: string[] = interests.flatMap((interest) => (INTEREST_QUERIES[interest] ?? []).slice(0, 2));
    const uniqueQueries = [...new Set(queries)];

    const results = await Promise.allSettled(
      uniqueQueries.map((query) => fetchPlacesForQuery(query, destination.trim(), apiKey))
    );

    const allPlaces: GooglePlace[] = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    const seenIds = new Set<string>();
    const uniquePlaces = allPlaces.filter((place) => {
      if (!place.id || seenIds.has(place.id)) return false;
      seenIds.add(place.id);
      return true;
    });

    const pois: POI[] = uniquePlaces
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .map((place) => mapGooglePlaceToPOI(place, destination.trim()));

    return NextResponse.json({ pois }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}