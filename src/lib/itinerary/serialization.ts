import { Trip } from '@prisma/client';
import { Itinerary, TripIntake, LockedAccommodation, MinifiedTimelineItem, DayItinerary } from '@/types';

// ── minifyAllDays ─────────────────────────────────────────────────────────────
// Produces a token-efficient skeleton of the entire trip for the Auto-Fit API.
// Each day is reduced to its pinned (isFixed) entries only, keyed by dayNumber.
// ─────────────────────────────────────────────────────────────────────────────
export function minifyAllDays(days: DayItinerary[]): Record<number, MinifiedTimelineItem[]> {
  const skeleton: Record<number, MinifiedTimelineItem[]> = {};
  for (const day of days) {
    skeleton[day.dayNumber] = minifyItineraryContext(day);
  }
  return skeleton;
}

export type DeserialisedTrip = Omit<Trip, 'intake' | 'itinerary' | 'lockedAccommodations'> & {
  intake: TripIntake | null;
  itinerary: Itinerary | null;
  lockedAccommodations: LockedAccommodation[];
};

export function deserializeTrip(dbTrip: Trip): DeserialisedTrip {
  return {
    ...dbTrip,
    intake: (dbTrip.intake ?? null) as unknown as TripIntake | null,
    itinerary: (dbTrip.itinerary ?? null) as unknown as Itinerary | null,
    lockedAccommodations: (dbTrip.lockedAccommodations ?? []) as unknown as LockedAccommodation[],
  };
}

// ── minifyItineraryContext ────────────────────────────────────────────────────
// Strips a DayItinerary down to the bare minimum fields needed by the AI for
// regeneration, preserving location data to prevent transit hallucinations.
// Only pinned (isFixed) entries are included — free entries will be regenerated.
// ─────────────────────────────────────────────────────────────────────────────
export function minifyItineraryContext(day: DayItinerary): MinifiedTimelineItem[] {
  return day.entries
    .filter((entry) => entry.isFixed)
    .map((entry): MinifiedTimelineItem => {
      // Derive endTime from startTime + durationMinutes when available
      let endTime: string | undefined;
      if (entry.time && entry.durationMinutes) {
        const [h, m] = entry.time.split(':').map(Number);
        const totalMins = h * 60 + m + entry.durationMinutes;
        const endH = Math.floor(totalMins / 60) % 24;
        const endM = totalMins % 60;
        endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      return {
        id: entry.id,
        title: entry.locationName,
        startTime: entry.time,
        endTime,
        location: {
          name: entry.locationName,
          placeId: entry.placeId ?? undefined,
          // googleMapsUrl carries the canonical address — use it as formattedAddress
          // so the AI can resolve transit without hallucinating coordinates.
          formattedAddress: entry.googleMapsUrl
            ? decodeURIComponent(
                entry.googleMapsUrl
                  .replace(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/, '')
                  .replace(/&query_place_id=.*$/, '')
                  .split('&')[0]
              )
            : undefined,
        },
      };
    });
}