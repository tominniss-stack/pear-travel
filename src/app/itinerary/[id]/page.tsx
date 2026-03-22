// ─────────────────────────────────────────────────────────────────────────────
// src/app/itinerary/[id]/page.tsx
// Itinerary Viewer — Fetches a saved trip by ID and renders the day-by-day plan.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { Itinerary, TripIntake } from '@/types';
import ItineraryPageClient from '@/app/itinerary/[id]/ItineraryPageClient';

// In Next.js 15, params is a Promise that must be awaited
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItineraryPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  // ── Fetch Trip ──────────────────────────────────────────────────────────────
  const trip = await prisma.trip.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!trip) {
    notFound();
  }

  // Cast the stored JSON back to our types
  const itinerary = trip.itinerary as unknown as Itinerary;
  const intake = trip.intake as unknown as TripIntake; // <-- Safely extract the intake JSON

  const clientTrip = {
    id: trip.id,
    destination: trip.destination,
    duration: trip.duration,
    budgetGBP: trip.budgetGBP,
    startDate: trip.startDate ? trip.startDate.toISOString() : null,
    endDate: trip.endDate ? trip.endDate.toISOString() : null,
    intake: intake, // <-- Explicitly add the intake to the payload!
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ItineraryPageClient
      dbTrip={clientTrip}
      dbItinerary={itinerary}
    />
  );
}