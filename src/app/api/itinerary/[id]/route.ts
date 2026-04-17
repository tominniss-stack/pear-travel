// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/itinerary/[id]
// Regenerates a single day of an existing itinerary.
//
// Body: { dayNumber: number; lockedTimelineItems: MinifiedTimelineItem[] }
//
// The lockedTimelineItems array contains ONLY the pinned entries for that day,
// minified to the bare minimum fields (id, title, startTime, endTime, location)
// to keep the Gemini token budget as low as possible while preserving enough
// location context to prevent transit hallucinations.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateTripItineraryAction } from '@/app/actions/trip';
import type { TripIntake, Itinerary, DayItinerary, MinifiedTimelineItem, DayOverride } from '@/types';

export const maxDuration = 60;

// ── Gemini client ─────────────────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  return new GoogleGenerativeAI(apiKey);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildRegenerateDayPrompt(
  intake: TripIntake,
  dayNumber: number,
  totalDays: number,
  lockedItems: MinifiedTimelineItem[],
  existingDay: DayItinerary,
  dayOverride?: DayOverride,
): string {
  const dailyBudget = Math.round(intake.budgetGBP / Math.max(totalDays, 1));

  const lockedBlock =
    lockedItems.length > 0
      ? lockedItems
          .map((item) => {
            const timeRange =
              item.startTime && item.endTime
                ? `${item.startTime}–${item.endTime}`
                : item.startTime ?? 'time TBD';
            const locationHint =
              item.location.formattedAddress ??
              item.location.name;
            return `  • [LOCKED] "${item.title}" @ ${timeRange} — ${locationHint}${item.location.placeId ? ` (placeId: ${item.location.placeId})` : ''}`;
          })
          .join('\n')
      : '  (none — regenerate the entire day freely)';

  const existingEntryNames = existingDay.entries
    .map((e) => `"${e.locationName}"`)
    .join(', ');

  // ── Day Override block ──
  const overrideLines: string[] = [];
  if (dayOverride?.pacing) overrideLines.push(`- Pacing Override:  ${dayOverride.pacing}`);
  if (dayOverride?.startTime) overrideLines.push(`- Start Time:       ${dayOverride.startTime}`);
  if (dayOverride?.hardcodedEvents) overrideLines.push(`- External Fixed Events (HARDCODED — must appear in timeline at stated times):\n  ${dayOverride.hardcodedEvents}`);
  const overrideBlock = overrideLines.length > 0 ? overrideLines.join('\n') : '  (none)';

  return `
You are an expert travel planner for Pear Travel. Regenerate ONLY Day ${dayNumber} of a ${totalDays}-day trip to ${intake.destination}.

════════════════════════════════════════
REGENERATION CONSTRAINTS
════════════════════════════════════════
- Destination:    ${intake.destination}
- Day Number:     ${dayNumber} of ${totalDays}
- Daily Budget:   ~£${dailyBudget} GBP
- Interests:      ${intake.interests.join(', ')}
- Dining Profile: ${intake.diningProfile ?? 'mid-range'}

DAY OVERRIDES:
${overrideBlock}

PINNED (LOCKED) ENTRIES — preserve these EXACTLY at their stated times:
${lockedBlock}

PREVIOUS ENTRIES (for context only — you may replace non-locked ones):
${existingEntryNames}

════════════════════════════════════════
RULES
════════════════════════════════════════
1. Keep every LOCKED entry at its exact time. Do NOT move, rename, or remove it.
2. Fill the remaining time slots with fresh, geographically sensible activities.
3. transitMethod MUST be one of: "Walking", "Tube", "Bus", "Metro", "Tram", "Taxi / Rideshare", "Train", "Ferry", "Cycling", "Start of Day".
4. Start the day with transitMethod: "Start of Day".
5. transitNote must include an estimated transit time (e.g. "12 minute walk").
6. Bookend entries (accommodation / hub) must have estimatedCostGBP: 0.
7. End the day by 21:30 at the latest.
8. Return a JSON object with a "day" key containing the DayItinerary, and an optional "ejectedItems" array at the root level.

CRITICAL TIE-BREAKER RULE:
If it is physically impossible to accommodate both a Pinned Item and the new hardcoded External Fixed Event due to transit times, the External Event wins. DO NOT silently delete the Pinned Item. You must remove it from the timeline and return it in a JSON array called "ejectedItems" at the root of your response. Each ejected item must include: id, title, startTime, endTime, and location (with name).

════════════════════════════════════════
JSON OUTPUT STRUCTURE
════════════════════════════════════════
{
  "day": {
    "dayNumber": ${dayNumber},
    "date": "${existingDay.date ?? null}",
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
  },
  "ejectedItems": []
}
`.trim();
}

// ── JSON extractor (mirrors main route) ──────────────────────────────────────

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return raw.slice(firstBrace, lastBrace + 1);
  return raw.trim();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function PUT(
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

    const { dayNumber, lockedTimelineItems, dayOverride } = body as {
      dayNumber: number;
      lockedTimelineItems: MinifiedTimelineItem[];
      dayOverride?: DayOverride;
    };

    if (typeof dayNumber !== 'number' || !Array.isArray(lockedTimelineItems)) {
      return NextResponse.json({ error: 'dayNumber and lockedTimelineItems are required.' }, { status: 400 });
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

    const existingDay = existingItinerary.days.find((d) => d.dayNumber === dayNumber);
    if (!existingDay) {
      return NextResponse.json({ error: `Day ${dayNumber} not found in itinerary.` }, { status: 404 });
    }

    // ── Call Gemini ──
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.45,
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildRegenerateDayPrompt(
      intake,
      dayNumber,
      existingItinerary.days.length,
      lockedTimelineItems,
      existingDay,
      dayOverride,
    );

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 });
    }

    // ── Parse the new wrapped response format ──
    let parsedResponse: { day?: DayItinerary; ejectedItems?: MinifiedTimelineItem[] };
    try {
      const parsed = JSON.parse(extractJSON(rawText));
      // Support both the new wrapped format { day, ejectedItems } and the legacy bare DayItinerary
      if (parsed?.day?.entries) {
        parsedResponse = parsed as { day: DayItinerary; ejectedItems?: MinifiedTimelineItem[] };
      } else if (parsed?.entries) {
        // Legacy fallback: AI returned bare DayItinerary
        parsedResponse = { day: parsed as DayItinerary, ejectedItems: [] };
      } else {
        throw new Error('Unrecognised response shape');
      }
    } catch {
      console.error('Regenerate day — JSON parse error:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 502 });
    }

    const regeneratedDay = parsedResponse.day!;
    const ejectedItems = parsedResponse.ejectedItems ?? [];

    if (!regeneratedDay?.entries || !Array.isArray(regeneratedDay.entries)) {
      return NextResponse.json({ error: 'Regenerated day failed validation.' }, { status: 502 });
    }

    // ── Merge back into the full itinerary and persist ──
    const updatedItinerary: Itinerary = {
      ...existingItinerary,
      days: existingItinerary.days.map((d) =>
        d.dayNumber === dayNumber ? regeneratedDay : d,
      ),
    };

    await updateTripItineraryAction(tripId, updatedItinerary);

    return NextResponse.json({ day: regeneratedDay, ejectedItems }, { status: 200 });
  } catch (error) {
    console.error('PUT /api/itinerary/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Regeneration failed: ${message}` }, { status: 500 });
  }
}
