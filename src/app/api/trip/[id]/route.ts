import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// ── UPDATE TRIP (PATCH) ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { itinerary: body.itinerary },
    });

    return NextResponse.json({ success: true, tripId: updatedTrip.id });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: "Failed to update itinerary" }, { status: 500 });
  }
}

// ── DELETE TRIP (DELETE) ──
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.trip.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}