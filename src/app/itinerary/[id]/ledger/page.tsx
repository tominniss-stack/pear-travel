import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LedgerClient from './LedgerClient';
import { deserializeTrip } from '@/lib/itinerary/serialization';

export default async function LedgerPage({ params }: { params: { id: string } }) {
  const dbTrip = await prisma.trip.findUnique({
    where: { id: params.id },
  });

  if (!dbTrip) {
    notFound();
  }

  // Use the approved strict deserializer
  const trip = deserializeTrip(dbTrip);

  // Guard against both missing itinerary and missing intake to satisfy strict TypeScript bounds
  if (!trip.itinerary || !trip.intake) {
    notFound(); 
  }

  // Flatten the trip object for the client component
  const clientTrip = {
    id: trip.id,
    destination: trip.destination,
    duration: trip.duration,
    budgetGBP: trip.budgetGBP,
    startDate: trip.startDate ? trip.startDate.toISOString() : null,
    endDate: trip.endDate ? trip.endDate.toISOString() : null,
    intake: trip.intake,
  };

  return (
    <LedgerClient 
      trip={clientTrip} 
      initialItinerary={trip.itinerary} 
    />
  );
}