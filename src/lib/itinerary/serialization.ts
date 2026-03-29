import { Trip } from '@prisma/client';
import { Itinerary, TripIntake, LockedAccommodation } from '@/types';

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