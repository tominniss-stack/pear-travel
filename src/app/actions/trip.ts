'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ── 1. The Creation Engine (V3) ──
export async function createTripAction(data: {
  title: string;
  destination: string;
  budgetGBP: number;
  duration: number;
  startDate?: Date;
  endDate?: Date;
  bookingMode: string;
  ownerId: string;
  intakeData: any;
  itinerary: any;
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the Master Trip directly using the JSON blobs
      // The user already exists via NextAuth, no upsert needed.
      const trip = await tx.trip.create({
        data: {
          destination: data.destination,
          budgetGBP: data.budgetGBP,
          duration: data.duration,
          startDate: data.startDate,
          endDate: data.endDate,
          bookingMode: data.bookingMode,
          ownerId: data.ownerId,     // Maps correctly to your schema
          intake: data.intakeData,   // V3 Schema field
          itinerary: data.itinerary, // V3 Schema field
        },
      })

      return trip
    })

    revalidatePath('/dashboard')
    return result
  } catch (error) {
    console.error('Trip Save Failed:', error)
    throw new Error('Failed to save trip to database')
  }
}

// ── 2. The Re-optimization Engine (V3) ──
export async function updateTripItineraryAction(tripId: string, itinerary: any) {
  try {
    // V3 doesn't require "nuke and pave" of individual POI rows anymore.
    // We simply overwrite the itinerary JSON blob.
    const result = await prisma.trip.update({
      where: { id: tripId },
      data: { itinerary: itinerary },
    });

    revalidatePath(`/itinerary/${tripId}`);
    return result;
  } catch (error) {
    console.error('Trip Update Failed:', error);
    throw new Error('Failed to update trip itinerary in database');
  }
}

// ── 3. ACTION: RENAME TRIP ──
export async function renameTripAction(tripId: string, newTitle: string) {
  try {
    // Note: 'title' is no longer in the V3 schema. If renaming is still needed, 
    // it relies on updating the 'destination' field.
    await prisma.trip.update({
      where: { id: tripId },
      data: { destination: newTitle },
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to rename trip:', error);
    throw new Error('Failed to rename trip');
  }
}

// ── 4. ACTION: TOGGLE BOOKING STATUS ──
export async function toggleTripBookingStatusAction(tripId: string, currentStatus: boolean) {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error('Trip not found');

    const intakeData = typeof trip.intake === 'string' ? JSON.parse(trip.intake) : (trip.intake || {});
    intakeData.bookingMode = !currentStatus ? 'booked' : 'planning';

    await prisma.trip.update({
      where: { id: tripId },
      data: { 
        bookingMode: !currentStatus ? 'booked' : 'planning',
        intake: intakeData 
      },
    });
    
    revalidatePath('/dashboard');
    revalidatePath(`/itinerary/${tripId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle booking status:', error);
    throw new Error('Failed to toggle status');
  }
}

export async function lockTripDates(tripId: string, startDateIso: string, endDateIso: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const trip = await prisma.trip.findUnique({ 
      where: { id: tripId }, 
      select: { ownerId: true }
    });
    
    if (!trip || trip.ownerId !== session.user.id) {
      return { error: 'Only the trip owner can lock dates.' };
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        startDate: new Date(startDateIso),
        endDate: new Date(endDateIso),
        bookingMode: 'booked'
      }
    });

    revalidatePath(`/itinerary/${tripId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to lock dates", error);
    return { error: 'Server error while locking dates.' };
  }
}