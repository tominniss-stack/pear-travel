// ─────────────────────────────────────────────────────────────────────────────
// POST /api/itinerary/[id]/autofit
// Multi-Day Concierge Auto-Fit
//
// Body: {
//   orphanedItems: MinifiedTimelineItem[],
//   tripSkeleton: Record<number, MinifiedTimelineItem[]>
// }
//
// Sends all orphaned (requiresReschedule) items plus a minified skeleton of the
// entire trip to Gemini. The AI finds the best logical gaps across multiple days
// based on geography and transit time, then returns ONLY the days it modified.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateTripItineraryAction } from '@/app/actions/trip';
import type { TripIntake, Itinerary, DayItinerary, MinifiedTimelineItem } from '@/types';

export const maxDuration = 90;

// ── Gemini client ─────────────────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  return new GoogleGenerativeAI(apiKey);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildAutoFitPrompt(
  intake: TripIntake,
  orphanedItems: MinifiedTimelineItem[],
  tripSkeleton: Record<number, MinifiedTimelineItem[]>,
  totalDays: number,
): string {
  const orphanedBlock = orphanedItems
    .map((item) => {
      const locationHint = item.location.formattedAddress ?? item.location.name;
      return `  • "${item.title}" — ${locationHint}${item.location.placeId ? ` (placeId: ${item.location.placeId})` : ''}`;
    })
    .join('\n');

  const skeletonBlock = Object.entries(tripSkeleton)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dayNum, items]) => {
      const dayLines =
        items.length > 0
          ? items
              .map((item) => {
                const timeRange =
                  item.startTime && item.endTime
                    ? `${item.startTime}–${item.endTime}`
                    : item.startTime ?? 'time TBD';
                return `    - "${item.title}" @ ${timeRange} (${item.location.name})`;
              })
              .join('\n')
          : '    (empty day — fully available)';
      return `  Day ${dayNum}:\n${dayLines}`;
    })
    .join('\n\n');

  return `
You are an expert travel concierge for Pear Travel. The user has orphaned items that MUST be rescheduled into their existing ${totalDays}-day trip to ${intake.destination}.

════════════════════════════════════════
ORPHANED ITEMS (must be placed somewhere)
════════════════════════════════════════
${orphanedBlock}

════════════════════════════════════════
CURRENT TRIP SKELETON (existing pinned/fixed items per day)
════════════════════════════════════════
${skeletonBlock}

════════════════════════════════════════
TRIP CONTEXT
════════════════════════════════════════
- Destination:    ${intake.destination}
- Total Days:     ${totalDays}
- Daily Budget:   ~£${Math.round(intake.budgetGBP / Math.max(totalDays, 1))} GBP
- Interests:      ${intake.interests.join(', ')}
- Dining Profile: ${intake.diningProfile ?? 'mid-range'}

════════════════════════════════════════
RULES
════════════════════════════════════════
1. Find the best logical gaps across the days based on geography and time.
2. You MAY override global pacing preferences to fit these items in.
3. You MUST strictly respect physical transit times. Do NOT hallucinate teleportation.
4. Keep all existing pinned items at their exact times — do NOT move them.
5. For each day you modify, return a COMPLETE DayItinerary with ALL entries (bookends + existing + newly inserted orphans).
6. transitMethod MUST be one of: "Walking", "Tube", "Bus", "Metro", "Tram", "Taxi / Rideshare", "Train", "Ferry", "Cycling", "Start of Day".
7. transitNote must include an estimated transit time (e.g. "12 minute walk").
8. Start each day with transitMethod: "Start of Day".
9. End each day by 21:30 at the latest.
10. Bookend entries (accommodation / hub) must have estimatedCostGBP: 0.
11. Return ONLY the specific days that you modified. If an orphaned item fits into Day 2 and Day 4, only return those two days.

════════════════════════════════════════
JSON OUTPUT STRUCTURE
════════════════════════════════════════
Return ONLY valid JSON in this exact shape — no markdown fences, no extra text:
{
  "updatedDays": {
    "2": {
      "dayNumber": 2,
      "date": null,
      "estimatedDailySpendGBP": 0,
      "entries": [
        {
          "id": "unique-entry-id",
          "time": "HH:MM",
          "locationName": "string",
          "activityDescription": "string",
          "transitMethod": "string",
          "transitNote": "string or null",
          "estimatedCostGBP": 0,
          "googleMapsUrl": "string",
          "placeId": "string or null",
          "isDining": false,
          "isFixed": false,
          "type": "ACTIVITY"
        }
      ]
    }
  }
}
`.trim();
}

// ── JSON extractor ────────────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return raw.slice(firstBrace, lastBrace + 1);
  return raw.trim();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tripId } = await params;

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

    const { orphanedItems, tripSkeleton } = body as {
      orphanedItems: MinifiedTimelineItem[];
      tripSkeleton: Record<number, MinifiedTimelineItem[]>;
    };

    if (!Array.isArray(orphanedItems) || orphanedItems.length === 0) {
      return NextResponse.json({ error: 'orphanedItems must be a non-empty array.' }, { status: 400 });
    }
    if (!tripSkeleton || typeof tripSkeleton !== 'object') {
      return NextResponse.json({ error: 'tripSkeleton is required.' }, { status: 400 });
    }

    // ── Load trip from DB ──
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });

    // ── Ownership check ──
    if (trip.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const existingItinerary = trip.itinerary as unknown as Itinerary;
    const intake = (typeof trip.intake === 'string'
      ? JSON.parse(trip.intake)
      : trip.intake) as TripIntake;

    const totalDays = existingItinerary.days.length;

    // ── Call Gemini ──
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-04-17',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildAutoFitPrompt(intake, orphanedItems, tripSkeleton, totalDays);

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 });
    }

    // ── Parse response ──
    let parsedResponse: { updatedDays: Record<string, DayItinerary> };
    try {
      const parsed = JSON.parse(extractJSON(rawText));
      if (!parsed?.updatedDays || typeof parsed.updatedDays !== 'object') {
        throw new Error('Missing updatedDays in response');
      }
      parsedResponse = parsed as { updatedDays: Record<string, DayItinerary> };
    } catch {
      console.error('Auto-Fit — JSON parse error:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 502 });
    }

    // ── Validate each returned day ──
    const updatedDaysMap = parsedResponse.updatedDays;
    for (const [dayKey, day] of Object.entries(updatedDaysMap)) {
      if (!day?.entries || !Array.isArray(day.entries)) {
        return NextResponse.json(
          { error: `Day ${dayKey} failed validation — missing entries array.` },
          { status: 502 },
        );
      }
    }

    // ── Surgically merge updated days back into the full itinerary and persist ──
    const updatedItinerary: Itinerary = {
      ...existingItinerary,
      days: existingItinerary.days.map((d) => {
        const updated = updatedDaysMap[String(d.dayNumber)];
        return updated ?? d;
      }),
    };

    await updateTripItineraryAction(tripId, updatedItinerary);

    // ── Return only the updated days (keyed by day number as number) ──
    const responseUpdatedDays: Record<number, DayItinerary> = {};
    for (const [key, day] of Object.entries(updatedDaysMap)) {
      responseUpdatedDays[Number(key)] = day;
    }

    return NextResponse.json({ updatedDays: responseUpdatedDays }, { status: 200 });
  } catch (error) {
    console.error('POST /api/itinerary/[id]/autofit error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Auto-Fit failed: ${message}` }, { status: 500 });
  }
}
