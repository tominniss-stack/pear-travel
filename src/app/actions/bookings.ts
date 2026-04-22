'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { BookingType } from '@prisma/client';

/*
 * ARCHITECTURE NOTES FOR FUTURE IMPLEMENTATION (LOGISTICS ENGINE):
 * 1. Waypoints: When building the UI, `ItineraryEntry` needs a `bookingRef` string and `isWaypoint` boolean to support mid-day bag drops at hotels.
 * 2. Dangling Refs: The deleteBooking action must eventually nullify any bookingRef inside the itinerary JSON. This requires a raw PostgreSQL update (prisma.$executeRaw) or an in-memory mutation, since Prisma cannot do nested JSON field updates natively. Plan for this before shipping the Logistics UI.
 * 3. Day Boundary Logic: In `recalc.ts`, transit bookings belong to a day strictly based on their `startDate` (even if an overnight flight lands on the next day).
 * 4. Locked UX: Bookend entries in `SortableItinerary` must be locked (no drag handle) and should have a "Managed" badge to afford clickability to the Logistics Modal.
 */

export type CreateBookingInput = {
  tripId: string;
  type: BookingType;
  title: string;
  startDate: Date;
  endDate?: Date | null;
  confirmationRef?: string | null;
  notes?: string | null;
  placeId?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  originName?: string | null;
  destinationName?: string | null;
  flightNumber?: string | null;
  destinationPlaceId?: string | null;
  destinationAddress?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
};

// Helper to check trip access
async function verifyTripAccess(tripId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorized');

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { ownerId: session.user.id },
        { collaborators: { some: { id: session.user.id } } }
      ]
    }
  });

  if (!trip) throw new Error('Trip not found or access denied');
  return trip;
}

export async function getTripBookings(tripId: string) {
  await verifyTripAccess(tripId);
  return prisma.booking.findMany({
    where: { tripId },
    orderBy: { startDate: 'asc' },
    include: { documents: true }
  });
}

export async function createBooking(data: CreateBookingInput) {
  await verifyTripAccess(data.tripId);

  const booking = await prisma.booking.create({
    data: {
      ...data,
      endDate: data.endDate || null,
      confirmationRef: data.confirmationRef || null,
      notes: data.notes || null,
      placeId: data.placeId || null,
      address: data.address || null,
      lat: data.lat || null,
      lng: data.lng || null,
      originName: data.originName || null,
      destinationName: data.destinationName || null,
      flightNumber: data.flightNumber || null,
      destinationPlaceId: data.destinationPlaceId || null,
      destinationAddress: data.destinationAddress || null,
      destinationLat: data.destinationLat || null,
      destinationLng: data.destinationLng || null,
    }
  });

  revalidatePath(`/itinerary/${data.tripId}`);
  revalidatePath(`/itinerary/${data.tripId}/v2`);
  
  return { success: true, booking };
}

export async function updateBooking(
  bookingId: string,
  tripId: string,
  data: Partial<Omit<CreateBookingInput, 'tripId'>>
) {
  await verifyTripAccess(tripId);

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      ...data,
      endDate: data.endDate ?? undefined,
      confirmationRef: data.confirmationRef ?? undefined,
      notes: data.notes ?? undefined,
      placeId: data.placeId ?? undefined,
      address: data.address ?? undefined,
      lat: data.lat ?? undefined,
      lng: data.lng ?? undefined,
      originName: data.originName ?? undefined,
      destinationName: data.destinationName ?? undefined,
      flightNumber: data.flightNumber ?? undefined,
      destinationPlaceId: data.destinationPlaceId ?? undefined,
      destinationAddress: data.destinationAddress ?? undefined,
      destinationLat: data.destinationLat ?? undefined,
      destinationLng: data.destinationLng ?? undefined,
    }
  });

  revalidatePath(`/itinerary/${tripId}`);
  revalidatePath(`/itinerary/${tripId}/v2`);

  return { success: true, booking };
}

export async function deleteBooking(bookingId: string, tripId: string) {
  await verifyTripAccess(tripId);
  
  await prisma.booking.delete({
    where: { id: bookingId }
  });

  revalidatePath(`/itinerary/${tripId}`);
  revalidatePath(`/itinerary/${tripId}/v2`);

  return { success: true };
}
