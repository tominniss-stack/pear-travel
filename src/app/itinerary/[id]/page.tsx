import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deserializeTrip } from "@/lib/itinerary/serialization";
import ItineraryPageClient from "./ItineraryPageClient";

export default async function ItineraryPage({ params }: { params: { id: string } }) {
  const dbTrip = await prisma.trip.findUnique({
    where: { id: params.id },
  });

  if (!dbTrip) {
    notFound();
  }

  const trip = deserializeTrip(dbTrip);

  // Guard: If either is missing, we can't render the V3 itinerary page.
  if (!trip.itinerary || !trip.intake) {
    notFound();
  }

  const clientTrip = {
    id: trip.id,
    destination: trip.destination,
    duration: trip.duration,
    budgetGBP: trip.budgetGBP,
    startDate: trip.startDate?.toISOString() || null,
    endDate: trip.endDate?.toISOString() || null,
    intake: trip.intake, // TypeScript now correctly identifies this as non-null
  };

  return (
    <ItineraryPageClient dbTrip={clientTrip} dbItinerary={trip.itinerary} />
  );
}