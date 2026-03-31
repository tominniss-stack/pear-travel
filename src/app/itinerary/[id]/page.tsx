import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deserializeTrip } from "@/lib/itinerary/serialization";
import ItineraryPageClient from "./ItineraryPageClient";

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // 👈 ADD THIS LINE HERE

  const dbTrip = await prisma.trip.findUnique({
    where: { id },  // 👈 THIS CHANGES FROM params.id TO JUST id
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
    startDate: trip.startDate?.toISOString() || null,
    endDate: trip.endDate?.toISOString() || null,
    intake: trip.intake,
  };

  return (
    <ItineraryPageClient dbTrip={clientTrip} dbItinerary={trip.itinerary} />
  );
}