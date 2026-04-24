'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AestheticPreference } from '@prisma/client';

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorised');

  try {
    // Fetch the user's aesthetic preference to seed the trip's themeOverride
    const userPrefs = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { aestheticPreference: true },
    });
    const themeOverride = userPrefs?.aestheticPreference ?? 'CLASSIC';

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
          ownerId: session.user.id,       // Map directly from session
          intake: data.intakeData,        // V3 Schema field
          itinerary: data.itinerary,      // V3 Schema field
          themeOverride,                  // Seed from user's global aesthetic preference
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorised');

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { ownerId: true, collaborators: { select: { id: true } } }
  });
  if (!trip || (trip.ownerId !== session.user.id && !trip.collaborators.some(c => c.id === session.user.id))) throw new Error('Unauthorised');

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorised');

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { ownerId: true, collaborators: { select: { id: true } } }
  });
  if (!trip || (trip.ownerId !== session.user.id && !trip.collaborators.some(c => c.id === session.user.id))) throw new Error('Unauthorised');

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorised');

  try {
    const trip = await prisma.trip.findUnique({ 
      where: { id: tripId },
      select: { ownerId: true, intake: true, collaborators: { select: { id: true } } }
    });
    if (!trip) throw new Error('Trip not found');
    if (trip.ownerId !== session.user.id && !trip.collaborators.some(c => c.id === session.user.id)) throw new Error('Unauthorised');

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
  if (!session?.user?.id) throw new Error('Unauthorised');

  try {
    const trip = await prisma.trip.findUnique({ 
      where: { id: tripId }, 
      select: { ownerId: true }
    });
    
    if (!trip || trip.ownerId !== session.user.id) {
      throw new Error('Unauthorised');
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
    if (error instanceof Error && error.message === 'Unauthorised') throw error;
    console.error("Failed to lock dates", error);
    throw new Error('Server error while locking dates.');
  }
}

export async function updateTripThemeAction(tripId: string, theme: AestheticPreference) {
  console.log("ACTUAL THEME SAVING:", theme, "FOR TRIP:", tripId);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { ownerId: true, collaborators: { select: { id: true } } }
    });
    
    if (!trip || (trip.ownerId !== session.user.id && !trip.collaborators.some(c => c.id === session.user.id))) {
      throw new Error('Unauthorised');
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { themeOverride: theme }
    });

    revalidatePath(`/itinerary/${tripId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update trip theme:", error);
    return { success: false, error: "Failed to update theme" };
  }
}

export async function updateTripTerminalColorAction(tripId: string, color: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { ownerId: true, collaborators: { select: { id: true } } }
    });
    
    if (!trip || (trip.ownerId !== session.user.id && !trip.collaborators.some(c => c.id === session.user.id))) {
      throw new Error('Unauthorised');
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { terminalColor: color }
    });

    revalidatePath(`/itinerary/${tripId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update trip terminal color:", error);
    return { success: false, error: "Failed to update terminal color" };
  }
}