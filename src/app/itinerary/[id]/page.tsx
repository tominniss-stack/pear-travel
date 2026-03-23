import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ItineraryPageClient from '@/app/itinerary/[id]/ItineraryPageClient';
import type { Itinerary, TripIntake, TransitMethod } from '@/types';

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch Trip + Days + POIs in one relational query
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      days: {
        orderBy: { orderIndex: 'asc' },
        include: {
          pois: { orderBy: { orderIndex: 'asc' } }
        }
      }
    }
  });

  if (!trip) notFound();

// 2. Map relational data back to the Itinerary type for the UI
  const mappedItinerary: Itinerary = {
    id: trip.id,                               // <-- ADDED THIS
    generatedAt: trip.createdAt.toISOString(), // <-- ADDED THIS
    totalEstimatedCostGBP: trip.budgetGBP,
    essentials: trip.overviewData as any, 
    days: trip.days.map((day) => ({
      dayNumber: day.orderIndex + 1,
      date: day.date?.toISOString(),
      location: day.location || '',
      theme: day.theme || '',
      estimatedDailySpendGBP: day.pois.reduce((sum, p) => sum + p.costGBP, 0),
      entries: day.pois.map((poi) => ({
        id: poi.id,
        time: poi.startTime || '',
        locationName: poi.name,
        activityDescription: poi.description || '',
        estimatedCostGBP: poi.costGBP,
        isFixed: poi.isFixed,
        isDining: poi.category === 'DINING',
        isAccommodation: poi.category === 'ACCOMMODATION',
        transitMethod: (poi.transitMethod as TransitMethod) || 'Walking',
        transitNote: poi.transitNote || '',
        placeId: poi.googlePlaceId || '',
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(poi.name)}`,
      }))
    }))
  };

  const clientTrip = {
    id: trip.id,
    destination: trip.destination,
    duration: trip.duration,
    budgetGBP: trip.budgetGBP,
    startDate: trip.startDate?.toISOString() || null,
    endDate: trip.endDate?.toISOString() || null,
    intake: trip.intakeData as unknown as TripIntake,
  };

  return <ItineraryPageClient dbTrip={clientTrip} dbItinerary={mappedItinerary} />;
}