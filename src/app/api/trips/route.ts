import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const trips = await prisma.trip.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { collaborators: { some: { id: session.user.id } } }
        ]
      },
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