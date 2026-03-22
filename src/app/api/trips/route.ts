import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        destination: true,
        duration: true,
        startDate: true,
        endDate: true,
        budgetGBP: true,
        createdAt: true,
      },
    });
    return NextResponse.json(trips);
  } catch (error) {
    console.error("Fetch Trips Error:", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}