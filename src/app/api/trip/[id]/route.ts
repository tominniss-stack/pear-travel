import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// ── GET TRIP ──
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const trip = await prisma.trip.findUnique({
    where:  { id },
    select: { ownerId: true, collaborators: { select: { id: true } } },
  });
  if (!trip || (trip.ownerId !== session.user.id && !trip.collaborators.some(c => c.id === session.user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  try {
    const fullTrip = await prisma.trip.findUnique({ where: { id } });
    return NextResponse.json(fullTrip);
  } catch (error) {
    console.error('Fetch Error:', error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}

// ── UPDATE TRIP (PATCH) ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    const trip = await prisma.trip.findUnique({
      where:  { id },
      select: { ownerId: true, collaborators: { select: { id: true } } },
    });
    if (!trip || (trip.ownerId !== session.user.id && !trip.collaborators.some(c => c.id === session.user.id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { destination, duration, budgetGBP, intake, itinerary } = body;
    
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { destination, duration, budgetGBP, intake, itinerary },
    });

    return NextResponse.json({ success: true, tripId: updatedTrip.id });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

// ── DELETE TRIP (DELETE) ──
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    const trip = await prisma.trip.findUnique({
      where:  { id },
      select: { ownerId: true },
    });
    // Owner-only: collaborators cannot delete trips.
    if (!trip || trip.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.trip.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}