// src/app/itinerary/[id]/v2/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deserializeTrip } from "@/lib/itinerary/serialization";
import ItineraryPageClientV2 from "./ItineraryPageClientV2";

export default async function PlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // 👈 THIS LINE WAS MISSING

  const dbTrip = await prisma.trip.findUnique({
    where: { id }, // 👈 was { id: id } which errored because id wasn't defined yet
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
    <ItineraryPageClientV2 dbTrip={clientTrip} dbItinerary={trip.itinerary} />
  );
}