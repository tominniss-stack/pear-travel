import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LedgerClient from './LedgerClient';
import { deserializeTrip } from '@/lib/itinerary/serialization';

export default async function LedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const dbTrip = await prisma.trip.findUnique({
    where: { id },
  });

  if (!dbTrip) {
    notFound();
  }

  const trip = deserializeTrip(dbTrip);

  if (!trip.itinerary || !trip.intake) {
    notFound();
  }

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