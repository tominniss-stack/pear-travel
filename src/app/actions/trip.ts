'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createTripAction(data: {
  title: string;
  destination: string;
  budgetGBP: number;
  duration: number;
  startDate?: Date;
  endDate?: Date;
  ownerId: string;
  intakeData: any;
  itinerary: any;
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      
      // ── Ensure the user exists before creating the trip ──
      await tx.user.upsert({
        where: { id: data.ownerId },
        update: {},
        create: {
          id: data.ownerId,
          name: 'Pear Travel Guest',
          email: 'guest@peartravel.app'
        }
      });

      // 1. Create the Master Trip
      const trip = await tx.trip.create({
        data: {
          title: data.title,
          destination: data.destination,
          budgetGBP: data.budgetGBP,
          duration: data.duration,
          startDate: data.startDate,
          endDate: data.endDate,
          ownerId: data.ownerId,
          intakeData: data.intakeData,
          overviewData: data.itinerary.essentials,
        },
      })

      // 2. Map through AI Days and create relational rows
      for (const [index, dayData] of data.itinerary.days.entries()) {
        await tx.day.create({
          data: {
            tripId: trip.id,
            orderIndex: index,
            location: dayData.location || '',
            theme: dayData.theme || '',
            pois: {
              create: dayData.entries.map((poi: any, poiIdx: number) => ({
                tripId: trip.id,
                name: poi.locationName,
                description: poi.activityDescription,
                startTime: poi.time,
                costGBP: poi.estimatedCostGBP || 0,
                isFixed: poi.isFixed || false,
                category: poi.isDining ? 'DINING' : poi.isAccommodation ? 'ACCOMMODATION' : 'ACTIVITY',
                transitMethod: poi.transitMethod,
                transitNote: poi.transitNote,
                googlePlaceId: poi.placeId,
                orderIndex: poiIdx,
              })),
            },
          },
        })
      }

      return trip
    })

    revalidatePath('/dashboard')
    return result
  } catch (error) {
    console.error('Relational Save Failed:', error)
    throw new Error('Failed to save trip to database')
  }
}

// ── NEW: The "Nuke and Pave" Re-optimization Engine ──
export async function updateTripItineraryAction(tripId: string, itinerary: any) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Nuke: Delete the old timeline. 
      // (We delete POIs first to avoid foreign key constraint errors, then Days)
      await tx.pOI.deleteMany({ where: { tripId: tripId } });
      await tx.day.deleteMany({ where: { tripId: tripId } });

      // 2. Pave: Recreate the new AI-optimized timeline
      for (const [index, dayData] of itinerary.days.entries()) {
        await tx.day.create({
          data: {
            tripId: tripId,
            orderIndex: index,
            location: dayData.location || '',
            theme: dayData.theme || '',
            pois: {
              create: dayData.entries.map((poi: any, poiIdx: number) => ({
                tripId: tripId,
                name: poi.locationName,
                description: poi.activityDescription,
                startTime: poi.time,
                costGBP: poi.estimatedCostGBP || 0,
                isFixed: poi.isFixed || false,
                category: poi.isDining ? 'DINING' : poi.isAccommodation ? 'ACCOMMODATION' : 'ACTIVITY',
                transitMethod: poi.transitMethod,
                transitNote: poi.transitNote,
                googlePlaceId: poi.placeId,
                orderIndex: poiIdx,
              })),
            },
          },
        });
      }

      // 3. Update the essentials just in case the AI generated new cultural tips based on the new places
      if (itinerary.essentials) {
        await tx.trip.update({
          where: { id: tripId },
          data: { overviewData: itinerary.essentials },
        });
      }

      return true;
    });

    revalidatePath(`/itinerary/${tripId}`);
    return result;
  } catch (error) {
    console.error('Relational Update Failed:', error);
    throw new Error('Failed to update trip itinerary in database');
  }
}

export async function toggleTripBookingStatus(tripId: string, currentStatus: boolean) {
  await prisma.trip.update({ where: { id: tripId }, data: { isBooked: !currentStatus } })
  revalidatePath(`/itinerary/${tripId}`)
}