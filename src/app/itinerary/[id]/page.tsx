import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deserializeTrip } from "@/lib/itinerary/serialization";
import ItineraryPageClient from "./ItineraryPageClient";

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // 👈 ADD THIS LINE HERE

  const dbTrip = await prisma.trip.findUnique({
    where: { id },
    include: {
      bookings: true,
    },
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
    themeOverride: dbTrip.themeOverride,
    terminalColor: dbTrip.terminalColor,
    bookings: dbTrip.bookings.map(b => ({
      ...b,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
  };

  return (
    <ItineraryPageClient dbTrip={clientTrip} dbItinerary={trip.itinerary} />
  );
}