// ─────────────────────────────────────────────────────────────────────────────
// POST /api/itinerary/[id]/autofit
// Multi-Day Concierge Auto-Fit — Chain-of-Thought Geographic Planner
//
// Body: {
//   orphanedItems: MinifiedTimelineItem[],      // requiresReschedule === true → MUST place
//   aspirationalItems: MinifiedTimelineItem[],  // requiresReschedule !== true → place if possible
//   tripSkeleton: Record<number, MinifiedTimelineItem[]>
// }
//
// Sends mandatory orphaned items + optional aspirational items plus a minified
// skeleton of the entire trip to Gemini. The AI acts as a geographic planner,
// clustering by neighbourhood, respecting physics/transit, and returning a
// structured proposals array with per-day impact summaries.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateTripItineraryAction } from '@/app/actions/trip';
import type { TripIntake, Itinerary, DayItinerary, MinifiedTimelineItem, AutoFitProposal } from '@/types';

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
  aspirationalItems: MinifiedTimelineItem[],
  tripSkeleton: Record<number, MinifiedTimelineItem[]>,
  totalDays: number,
): string {
  const formatItem = (item: MinifiedTimelineItem) => {
    const locationHint = item.location.formattedAddress ?? item.location.name;
    const coords =
      item.location.lat != null && item.location.lng != null
        ? ` [${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}]`
        : '';
    return `  • id:"${item.id}" — "${item.title}" @ ${locationHint}${coords}${item.location.placeId ? ` (placeId: ${item.location.placeId})` : ''}`;
  };

  const orphanedBlock =
    orphanedItems.length > 0
      ? orphanedItems.map(formatItem).join('\n')
      : '  (none)';

  const aspirationalBlock =
    aspirationalItems.length > 0
      ? aspirationalItems.map(formatItem).join('\n')
      : '  (none)';

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
                const coords =
                  item.location.lat != null && item.location.lng != null
                    ? ` [${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}]`
                    : '';
                return `    - id:"${item.id}" "${item.title}" @ ${timeRange} (${item.location.name}${coords})`;
              })
              .join('\n')
          : '    (empty day — fully available)';
      return `  Day ${dayNum}:\n${dayLines}`;
    })
    .join('\n\n');

  return `
You are an elite travel concierge for Pear Travel. You have MANDATORY 'orphanedItems' and OPTIONAL 'aspirationalItems'. You must place them into the 'tripSkeleton'.

CRITICAL RULES:
1. GEOGRAPHIC CLUSTERING: Do not assign items sequentially. Look at the coordinates/locations. You MUST group new items with existing items in the same neighbourhood on the same day.
2. PHYSICS & TIME: You must allocate realistic durations for activities (e.g., 2+ hours for a museum). You must calculate logical transit times between locations. Do not hallucinate teleportation.
3. OPERATING HOURS: Respect standard real-world opening hours. Do not schedule a gallery at 11:00 PM.
4. IMPACT SUMMARY: For every day you modify, write a 2-sentence 'impactSummary' explaining what you added and how it changed the day (e.g., 'Added the Louvre. You will need to start 45 mins earlier and transit across the river.').
5. MANDATORY vs OPTIONAL: Every item in orphanedItems MUST be placed. Items in aspirationalItems should be placed only if they fit without disrupting the day.
6. Keep all existing pinned items at their exact times — do NOT move them.
7. For each day you modify, return a COMPLETE proposedDayItinerary with ALL entries (bookends + existing + newly inserted items).
8. transitMethod MUST be one of: "Walking", "Tube", "Bus", "Metro", "Tram", "Taxi / Rideshare", "Train", "Ferry", "Cycling", "Start of Day".
9. transitNote must include an estimated transit time (e.g. "12 minute walk").
10. Start each day with transitMethod: "Start of Day".
11. End each day by 21:30 at the latest.
12. Bookend entries (accommodation / hub) must have estimatedCostGBP: 0.

════════════════════════════════════════
MANDATORY ORPHANED ITEMS (MUST be placed)
════════════════════════════════════════
${orphanedBlock}

════════════════════════════════════════
OPTIONAL ASPIRATIONAL ITEMS (place if they fit)
════════════════════════════════════════
${aspirationalBlock}

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
CHAIN OF THOUGHT — work through these steps before writing JSON:
════════════════════════════════════════
Step 1 — CLUSTER: For each new item, identify which existing day has the most geographically proximate existing entries (same neighbourhood / shortest transit).
Step 2 — CAPACITY CHECK: For each candidate day, calculate total time used by existing pinned items. Determine how many free hours remain.
Step 3 — SLOT: Insert each new item into the best available time slot, respecting realistic durations and transit times.
Step 4 — VALIDATE: Confirm no entry ends after 21:30. Confirm no teleportation (transit times are realistic). Confirm mandatory items are all placed.
Step 5 — SUMMARISE: Write the 2-sentence impactSummary for each modified day.

════════════════════════════════════════
JSON OUTPUT STRUCTURE
════════════════════════════════════════
Return ONLY valid JSON in this exact shape — no markdown fences, no extra text:
{
  "proposals": [
    {
      "dayNumber": 2,
      "addedItemIds": ["id-of-item-1", "id-of-item-2"],
      "impactSummary": "Added the Louvre and Sainte-Chapelle, both on the Île de la Cité. You will need to start 45 minutes earlier to fit both before your evening reservation.",
      "proposedDayItinerary": {
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
  ]
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

    const { orphanedItems, aspirationalItems = [], tripSkeleton } = body as {
      orphanedItems: MinifiedTimelineItem[];
      aspirationalItems: MinifiedTimelineItem[];
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
        maxOutputTokens: 16384,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildAutoFitPrompt(intake, orphanedItems, aspirationalItems, tripSkeleton, totalDays);

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 });
    }

    // ── Parse response ──
    let parsedResponse: { proposals: AutoFitProposal[] };
    try {
      const parsed = JSON.parse(extractJSON(rawText));
      if (!parsed?.proposals || !Array.isArray(parsed.proposals)) {
        throw new Error('Missing proposals array in response');
      }
      parsedResponse = parsed as { proposals: AutoFitProposal[] };
    } catch {
      console.error('Auto-Fit — JSON parse error:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 502 });
    }

    // ── Validate each proposal ──
    for (const proposal of parsedResponse.proposals) {
      if (
        typeof proposal.dayNumber !== 'number' ||
        !proposal.proposedDayItinerary?.entries ||
        !Array.isArray(proposal.proposedDayItinerary.entries)
      ) {
        return NextResponse.json(
          { error: `Proposal for day ${proposal.dayNumber} failed validation — missing entries array.` },
          { status: 502 },
        );
      }
    }

    // ── Surgically merge proposed days back into the full itinerary and persist ──
    const proposalsByDay = new Map<number, DayItinerary>(
      parsedResponse.proposals.map((p) => [p.dayNumber, p.proposedDayItinerary]),
    );

    const updatedItinerary: Itinerary = {
      ...existingItinerary,
      days: existingItinerary.days.map((d) => proposalsByDay.get(d.dayNumber) ?? d),
    };

    await updateTripItineraryAction(tripId, updatedItinerary);

    return NextResponse.json({ proposals: parsedResponse.proposals }, { status: 200 });
  } catch (error) {
    console.error('POST /api/itinerary/[id]/autofit error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Auto-Fit failed: ${message}` }, { status: 500 });
  }
}
