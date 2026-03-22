// ─────────────────────────────────────────────────────────────────────────────
// POST /api/itinerary
// Accepts TripIntake + selectedPOIs, calls Gemini to generate a structured
// day-by-day itinerary, saves the result to PostgreSQL, and returns the DB ID.
// Includes V2 Hard Constraints, Dining Profiles, and Date Logic.
//
// PATCH /api/itinerary
// NEW: Performs an intelligent RE-OPTIMISATION by taking the existing plan
// and merging new candidate POIs into the timeline geographically.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TripIntake, POI, Itinerary } from '@/types';

export const maxDuration = 60; // Allow the AI up to 60 seconds to re-optimize

// ── Gemini client initialiser ─────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  return new GoogleGenerativeAI(apiKey);
}

// ── System prompt builder (V2 Brain with Anti-Cramming & Anchor Points) ─────

function buildActivityCapInstructions(duration: number): string {
  if (duration === 1) return '2–3 activities (keep it relaxed for a day trip)';
  if (duration <= 2) return '3–4 activities per day (balanced pacing)';
  if (duration <= 4) return '4–5 activities per day (moderate pacing)';
  return '3–5 activities per day (spread out to avoid burnout on longer trips)';
}

// ── Intelligent duration defaults by location category ─────────────────────

function getDefaultDurationByCategory(category: string): number {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('museum') || categoryLower.includes('gallery') || 
      categoryLower.includes('cathedral') || categoryLower.includes('monument')) {
    return 150; 
  }
  
  if (categoryLower.includes('restaurant') || categoryLower.includes('cafe') || 
      categoryLower.includes('bar') || categoryLower.includes('food')) {
    return 75; 
  }
  
  if (categoryLower.includes('market') || categoryLower.includes('shopping') || 
      categoryLower.includes('neighborhood') || categoryLower.includes('district')) {
    return 60; 
  }
  
  if (categoryLower.includes('viewpoint') || categoryLower.includes('view') || 
      categoryLower.includes('photo') || categoryLower.includes('architecture') ||
      categoryLower.includes('park') || categoryLower.includes('plaza')) {
    return 40; 
  }
  
  return 90; 
}

// ── Parse anchor points into timed vs priority anchors ──────────────────────

function parseAnchorPoints(anchorText: string): {
  timedAnchors: Array<{ dayNumber: number; startTime: string; endTime: string; description: string }>;
  priorityAnchors: Array<{ name: string; description: string }>;
} {
  const timedAnchors: Array<{ dayNumber: number; startTime: string; endTime: string; description: string }> = [];
  const priorityAnchors: Array<{ name: string; description: string }> = [];

  if (!anchorText?.trim()) {
    return { timedAnchors, priorityAnchors };
  }

  const lines = anchorText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const timedMatch = line.match(/day\s+(\d+)\s+(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?\s*[:\-]?\s*(.*)/i);
    
    if (timedMatch) {
      const dayNum = parseInt(timedMatch[1], 10);
      const startHour = timedMatch[2];
      const startMin = timedMatch[3] || '00';
      const endHour = timedMatch[4];
      const endMin = timedMatch[5] || '00';
      const desc = timedMatch[6].trim();

      timedAnchors.push({
        dayNumber: dayNum,
        startTime: `${startHour.padStart(2, '0')}:${startMin}`,
        endTime: `${endHour.padStart(2, '0')}:${endMin}`,
        description: desc,
      });
    } else {
      priorityAnchors.push({
        name: line,
        description: line,
      });
    }
  }

  return { timedAnchors, priorityAnchors };
}

function buildPrompt(intake: TripIntake, pois: POI[], existingItinerary?: Itinerary): string {
  const dailyBudget = Math.round(intake.budgetGBP / Math.max(intake.duration, 1));
  const activityCap = buildActivityCapInstructions(intake.duration);
  const { timedAnchors, priorityAnchors } = parseAnchorPoints(intake.anchorPoints ?? '');
  
  const isDayTrip = intake.duration === 1;
  const userAccommodation = intake.accommodation?.trim();

  // DYNAMIC HUB LOGIC: Intelligent fallback if user leaves it blank
  const dayTripHubLogic = userAccommodation
    ? `Start and end the itinerary at: "${userAccommodation}".`
    : `Since no specific arrival point was provided, YOU MUST logically infer the main central train station or primary transport hub for ${intake.destination} (e.g., "Cambridge Railway Station", "Milano Centrale") and use that specific name as the start and end point.`;

  const multiDayHubLogic = userAccommodation
    ? `STRICT NAMING RULE: You MUST use the EXACT string provided here for the accommodation locationName: "${userAccommodation}".`
    : `STRICT NAMING RULE: Since no hotel was specified, use a realistic placeholder like "City Centre Hotel" or "Accommodation in Central ${intake.destination}".`;

  // Exact Naming, Strict Bookends & Buffers
  const routingInstructions = isDayTrip 
    ? `DAY TRIP ROUTING (1-DAY ITINERARY):
- The user is NOT staying overnight. Do NOT use the words "Accommodation", "Hotel", or "Check-in".
- START OF DAY: ${dayTripHubLogic}
- ARRIVAL BUFFER: The user arrives at ${intake.arrivalTime ?? '09:00'}. You MUST schedule 15-30 minutes of transit/parking time from the Arrival Hub BEFORE starting the first leisure activity. Do not start the first activity at the exact arrival time.
- END OF DAY: The final activity must be returning to this exact same Arrival Hub for departure at ${intake.departureTime ?? '18:00'}.`
    : `HOME BASE ROUTING:
- EVERY SINGLE DAY (Day 1, Day 2, Day 3, etc.) MUST strictly start with an entry for the accommodation.
- EVERY SINGLE DAY MUST strictly end with an entry for the accommodation.
- ${multiDayHubLogic}
- DO NOT geocode the accommodation into a street address. DO NOT append tags like "[START]" or "[END]" to the locationName. Use ONLY the exact string requested above.`;

  // Arrival buffer logic
  const dateContext = intake.bookingMode === 'booked' && intake.startDate
    ? `
CONFIRMED TRAVEL DATES:
  Arrival Date:      ${intake.startDate}
  Arrival Time:      ${intake.arrivalTime ?? 'time not specified'} (This is Touchdown/Station Arrival time)
  Departure Date:    ${intake.endDate   ?? 'not specified'}
  Departure Time:    ${intake.departureTime ?? 'time not specified'} (This is Takeoff/Train Departure time)
  Total Nights:      ${intake.duration}

  CRITICAL DATE & TRANSIT CONSTRAINTS:
  - Day 1 Arrival: The user arrives in the city at ${intake.arrivalTime ?? '09:00'}. You MUST add at least 60-90 minutes of transit/customs time before scheduling the first "Check-in at accommodation" entry. Do NOT schedule the hotel check-in at the exact arrival time.
  - Final Day Departure: The user leaves at ${intake.departureTime ?? '12:00'}. The final activity of the whole trip must be returning to the accommodation or traveling to the airport at least 2.5 hours BEFORE this departure time.`
    : `Trip Duration: ${intake.duration} day(s) — exact dates not confirmed. Use 09:00 as a standard start time.`;

  const diningInstructions = {
    'packed-lunch': `
  LUNCH: Packed lunch. Do NOT suggest a restaurant. Suggest a park/viewpoint. Set isDining: true, estimatedCostGBP: 0.
  DINNER: Budget-friendly local restaurant or street food spot (under £15/person).`,
    'budget': `
  LUNCH: Street food stalls, market halls, casual cafés. Max £12/person.
  DINNER: Local neighbourhood restaurants, tapas bars. Max £20/person.`,
    'mid-range': `
  LUNCH: Relaxed bistros, popular local spots. £12–25/person.
  DINNER: Well-reviewed restaurants with good atmosphere. £25–45/person.`,
    'fine-dining': `
  LUNCH: Quality restaurant (e.g. Michelin Bib Gourmand). £25–50/person.
  DINNER: Upscale or Michelin-starred restaurant. £60+/person. Name a specific place.`,
  }[intake.diningProfile ?? 'mid-range'];

  const poisDetail = pois
    .map((poi, i) => `
  [${i + 1}] "${poi.name}"
      Category: ${poi.category} | Entry Cost: £${poi.estimatedCostGBP} | Suggested Duration: ${poi.avgDurationMinutes} mins
      Address: ${poi.address} | PlaceID: ${poi.placeId}
      Opening Hours: ${poi.openingHours?.weekdayDescriptions?.join(' | ') ?? 'Standard 09:00–18:00'}`)
    .join('\n');

  const anchorPointsSection = timedAnchors.length > 0 || priorityAnchors.length > 0
    ? `
TIMED ANCHORS (Locked Blocks):
${timedAnchors.length > 0
  ? timedAnchors.map(a => `  - Day ${a.dayNumber}: ${a.startTime}–${a.endTime} — ${a.description} (Mark isFixed: true)`)
      .join('\n')
  : '  (None)'}

PRIORITY ANCHORS (Must-Include, Schedule Early):
${priorityAnchors.length > 0
  ? priorityAnchors.map(a => `  - "${a.name}" (Schedule this before AI-suggested POIs, mark isFixed: true)`)
      .join('\n')
  : '  (None)'}

CRITICAL ANCHOR RULES:
1. Timed anchors: Generate as ItineraryEntry with exact times. Set isFixed: true on those entries. NEVER overlap with other activities.
2. Priority anchors: Identify matching POI by name, and schedule them early in geographic sequence. Set isFixed: true.
3. Do NOT output the literal text "[ANCHOR]" anywhere in the JSON.
4. Protect anchor times — always account for transit time; do NOT schedule another activity during an anchored block.
`
    : '';

  const durationGuidelines = `
════════════════════════════════════════
INTELLIGENT DURATION ASSIGNMENT (V2)
════════════════════════════════════════
DO NOT arbitrarily shorten activity durations to fit more activities. Use realistic times:
- Sightseeing / Viewpoints / Photo Ops / Architecture: 30–45 minutes
- Shopping / Markets / Casual Browsing: 45–60 minutes
- Dining (sitting, ordering, eating): 60–90 minutes
- Mid-size Museums / Attractions: 90–150 minutes (1.5–2.5 hours)
- Major Museums / Historic Sites: 150–180 minutes (2.5–3 hours)

If an activity cannot fit within the daily schedule while respecting these durations:
→ DROP IT FROM THE TIMELINE and move it to the "unscheduledOptions" bucket in the final JSON.
→ Do NOT shorten a 2-hour museum visit to 1 hour to squeeze it in.
`;

  const reoptimizationContext = existingItinerary ? `
════════════════════════════════════════
RE-OPTIMISATION / UPDATE REQUEST 🔄
════════════════════════════════════════
The user is updating an existing plan. You are being provided with the CURRENT schedule below.
Your task is to merge the NEW candidate places (listed in the POI section) into this existing flow.

CURRENT PLAN STATE:
${JSON.stringify(existingItinerary.days.map(d => ({ 
    day: d.dayNumber, 
    stops: d.entries.map(e => ({ name: e.locationName, isFixed: e.isFixed, time: e.time })) 
})))}

CRITICAL UPDATE RULES:
1. PRESERVE FIXED ENTRIES: Any entry marked "isFixed: true" in the current plan MUST remain at its specific HH:MM time.
2. GEOGRAPHIC CLUSTERING: Rearrange non-fixed activities to minimise travel time between existing stops and the NEW candidate stops.
3. PARKING LOT: If a new candidate stop doesn't fit, move it to "unscheduledOptions" with a friendly, conversational bracketed note explaining why. DO NOT use robotic terms like "central core" or "operating hours". Talk like a helpful human guide. (e.g. "[Unscheduled: It's a bit too far across town to fit into your Day 2 schedule without rushing.]")
` : '';

  return `
You are an expert travel planner for Pear Travel. Generate a realistic day-by-day itinerary as a single JSON object with high-fidelity scheduling.

${reoptimizationContext}

════════════════════════════════════════
TRIP PARAMETERS
════════════════════════════════════════
Destination:        ${intake.destination}
${dateContext}
Daily Budget:       ~£${dailyBudget} GBP
Total Budget:       £${intake.budgetGBP} GBP
Interests:          ${intake.interests.join(', ')}

${routingInstructions}
- First activity time = account for morning transit
- Final activity time = ensure 45–90 mins buffer to reach the end-of-day point

════════════════════════════════════════
ANCHOR POINTS & LOCKED TIMES
════════════════════════════════════════
${anchorPointsSection || 'No anchor points defined.'}

════════════════════════════════════════
SELECTED POIs / NEW CANDIDATES
════════════════════════════════════════
${poisDetail}

${durationGuidelines}

════════════════════════════════════════
ACTIVITY PACING — ANTI-CRAMMING RULES ⚡
════════════════════════════════════════
REALISTIC PACING IS CRITICAL. Users are travelling to enjoy, not to rush.

TARGET: ${activityCap}

RULES:
1. Build geographic sequences: group nearby POIs to minimize backtracking. Budget 20–45 mins per transit.
2. Respect realistic activity durations per the guidelines above. Do NOT shorten hours-long activities.
3. If overflow occurs: MOVE activities to "unscheduledOptions" bucket. Do NOT mention them in the main timeline.
4. PRIORITIZE by: User interests match → Highest ratings → Geographic proximity → Available time.
5. Include 15–30 min buffer time between activities (breathing room, photos, etc.).
6. End each day by 9–10 PM (avoid exhausting late-night schedules).

════════════════════════════════════════
ROUTING & DINING RULES & ACCOMMODATION COSTS
════════════════════════════════════════
1. transitMethod MUST be one of: "Walking", "Tube", "Bus", "Metro", "Tram", "Taxi / Rideshare", "Train", "Ferry", "Cycling", "Start of Day".
2. Start each day with transitMethod: "Start of Day" (no prior transit).
3. transitNote must include an estimated transit time (e.g. "15 minute walk", "20 minute Tube ride").
4. The next activity's start time must be calculated from the previous activity's start time + duration + transit time.
5. Final activity of each day: note return transit to your start point.
${diningInstructions}

⚠️ CRITICAL ACCOMMODATION/HUB COST & NAMING RULES:
  - Bookend entries (Accommodation/Hubs) must ALWAYS have an estimatedCostGBP: 0.
  - The locationName MUST EXACTLY follow the Naming Rules specified in the ROUTING section above. 
  - The user's daily budget of £${dailyBudget} is ONLY for activities and dining.

════════════════════════════════════════
JSON OUTPUT STRUCTURE & FIELD RULES
════════════════════════════════════════
Return ONLY valid JSON with the exact structure below:

{
  "id": "gen-123",
  "generatedAt": "2026-03-21T12:00:00Z",
  "totalEstimatedCostGBP": 0,
  "unscheduledOptions": [
    {
      "id": "unsch-1",
      "time": "N/A",
      "locationName": "string",
      "activityDescription": "[UNSCHEDULED] string",
      "transitMethod": "N/A",
      "estimatedCostGBP": 0,
      "googleMapsUrl": "string",
      "placeId": "string or null",
      "isDining": false,
      "isFixed": false
    }
  ],
  "essentials": {
    "destination": "${intake.destination}",
    "airportTransit": "string",
    "tippingEtiquette": "string",
    "transportCardAdvice": "string",
    "currency": "string",
    "emergencyNumbers": "string",
    "usefulPhrases": [{ "phrase": "string", "translation": "string" }],
    "plugType": "string",
    "tapWater": "string",
    "apps": ["string"],
    "contextualRisk": "string"
  },
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD or null",
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
          "isDining": boolean,
          "isAccommodation": boolean,
          "isFixed": boolean
        }
      ]
    }
  ]
}
`.trim();
}

// ── JSON extractor ────────────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/\x60\x60\x60(?:json)?\s*([\s\S]*?)\x60\x60\x60/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  const firstBrace = raw.indexOf('{');
  const lastBrace  = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw.trim();
}

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

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY missing.' }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

    const { intake, selectedPOIs } = body;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 12000, 
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildPrompt(intake, selectedPOIs);
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 });
    }

    const cleanedJSON = extractJSON(rawText);
    let itinerary: unknown;

    try {
      itinerary = JSON.parse(cleanedJSON);
    } catch (e) {
      console.error('JSON Parse Error. Raw response snippet:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 502 });
    }

    if (!validateItineraryShape(itinerary)) {
      return NextResponse.json({ error: 'Itinerary failed validation.' }, { status: 502 });
    }

    const dbTrip = await prisma.trip.create({
      data: {
        destination: intake.destination,
        duration:    intake.duration,
        startDate:   intake.startDate ? new Date(intake.startDate) : null,
        endDate:     intake.endDate   ? new Date(intake.endDate)   : null,
        budgetGBP:   intake.budgetGBP,
        intake:      intake as any,
        itinerary:   itinerary as any,
      },
    });

    return NextResponse.json({ tripId: dbTrip.id }, { status: 200 });
    
  } catch (error) {
    console.error('Unhandled Route Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed: ${message}` }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { tripId, newPOIs } = await request.json();
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.1-flash-lite-preview', 
      generationConfig: { responseMimeType: 'application/json' } 
    });
    
    const prompt = buildPrompt(trip.intake as any, newPOIs, trip.itinerary as any);
    const result = await model.generateContent(prompt);
    const newItinerary = JSON.parse(extractJSON(result.response.text()));

    if (!validateItineraryShape(newItinerary)) {
      return NextResponse.json({ error: 'Updated itinerary failed validation.' }, { status: 502 });
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { itinerary: newItinerary as any },
    });

    return NextResponse.json({ success: true, itinerary: newItinerary });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: 'Re-optimization failed' }, { status: 500 });
  }
}