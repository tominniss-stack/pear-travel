import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { itinerary } = body;

    if (!itinerary || !itinerary.days) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // ── RELATIONAL "NUKE & PAVE" SAVE ──
    // We run this in a transaction so it's perfectly safe. It either all saves, or none of it does.
    await prisma.$transaction(async (tx) => {
      
      // 1. Clear the old schedule for this trip
      await tx.pOI.deleteMany({ where: { tripId: id } });
      await tx.day.deleteMany({ where: { tripId: id } });

      // 2. Update the master Trip record (in case total costs or essentials changed)
      await tx.trip.update({
        where: { id },
        data: {
          budgetGBP: itinerary.totalEstimatedCostGBP,
          overviewData: itinerary.essentials,
        },
      });

      // 3. Rebuild the Days and POIs based on the new Drag & Drop layout
      for (const [index, dayData] of itinerary.days.entries()) {
        await tx.day.create({
          data: {
            tripId: id,
            orderIndex: index,
            location: dayData.location || '',
            theme: dayData.theme || '',
            pois: {
              create: dayData.entries.map((poi: any, poiIdx: number) => ({
                tripId: id,
                name: poi.locationName,
                description: poi.activityDescription,
                startTime: poi.time,
                costGBP: poi.estimatedCostGBP || 0,
                isFixed: poi.isFixed || false,
                category: poi.isDining ? 'DINING' : poi.isAccommodation ? 'ACCOMMODATION' : 'ACTIVITY',
                transitMethod: poi.transitMethod,
                transitNote: poi.transitNote,
                googlePlaceId: poi.placeId,
                orderIndex: poiIdx,
              })),
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update itinerary relationally:', error);
    return NextResponse.json({ error: 'Failed to save changes to database' }, { status: 500 });
  }
}