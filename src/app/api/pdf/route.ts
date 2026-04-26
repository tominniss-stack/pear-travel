export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { renderToStream } from '@react-pdf/renderer';
import qrcode from 'qrcode';
import TripFolioPDF from '@/components/pdf/TripFolioPDF';
import React from 'react';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { tripState, itineraryState } = body;

    if (!tripState || !itineraryState) {
      return new NextResponse('Bad Request: Missing trip or itinerary data', { status: 400 });
    }

    // QR Code Generation (CRITICAL ASYNC LOGIC)
    // QR Code generation must happen BEFORE renderToStream is called
    // because @react-pdf/renderer renders synchronously.
    const qrCodes = await Promise.all(
      itineraryState.days.flatMap((day: any) =>
        day.entries.map(async (e: any) => {
          const url = e.googleMapsUrl || (
            e.placeId && e.placeId !== "null"
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.locationName + ', ' + tripState.destination)}&query_place_id=${e.placeId}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.locationName + ', ' + tripState.destination)}`
          );

          return {
            id: e.id,
            dataUrl: await qrcode.toDataURL(url, { 
              width: 80, 
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' }
            })
          };
        })
      )
    );

    const stream = await renderToStream(
      React.createElement(TripFolioPDF, {
        trip: tripState,
        itinerary: itineraryState,
        qrCodes: qrCodes
      }) as any
    );

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${tripState.destination.replace(/\s+/g, '_')}_Folio.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}