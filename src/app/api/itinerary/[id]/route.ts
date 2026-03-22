// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/itinerary/[id]
// Updates an existing trip's itinerary in the database.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { Itinerary } from '@/types';

// ── Response validator ────────────────────────────────────────────────────────

function validateItineraryShape(obj: unknown): obj is Itinerary {
  if (typeof obj !== 'object' || obj === null) return false;
  const it = obj as Record<string, unknown>;
  return (
    typeof it.id === 'string' && 
    Array.isArray(it.days) && 
    typeof it.essentials === 'object' &&
    (Array.isArray(it.unscheduledOptions) || it.unscheduledOptions === undefined)
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tripId = resolvedParams.id;

    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.itinerary) {
      return NextResponse.json({ error: 'Itinerary is required in request body.' }, { status: 400 });
    }

    // Validate the itinerary shape
    if (!validateItineraryShape(body.itinerary)) {
      return NextResponse.json({ error: 'Itinerary failed validation.' }, { status: 400 });
    }

    // Verify the trip exists
    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    // Update the trip in the database
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        itinerary: body.itinerary as any,
      },
    });

    return NextResponse.json({ success: true, tripId: updatedTrip.id }, { status: 200 });
  } catch (error) {
    console.error('Unhandled PATCH Route Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed: ${message}` }, { status: 500 });
  }
}
