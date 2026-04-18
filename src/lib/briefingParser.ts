// ── Semantic Briefing Parser ──────────────────────────────────────────────────
// Pure utility: maps raw AI-generated text from CityEssentials into strict
// BriefingSemantics union types. No side effects. No imports from React/Next.
// All parsers fall back to 'UNKNOWN' or 'MIXED' on unrecognised input.

import type { BriefingSemantics } from '@/types/theme';
import type { CityEssentials } from '@/types';

// ── Tap Water ─────────────────────────────────────────────────────────────────

function parseTapWaterStatus(
  tapWater?: string,
): BriefingSemantics['tapWaterStatus'] {
  if (!tapWater) return 'UNKNOWN';

  const s = tapWater.toLowerCase();

  // Explicit unsafe signals
  if (
    /\b(unsafe|not safe|do not drink|don't drink|avoid|bottled|undrinkable|contaminated|not recommended|not potable)\b/.test(
      s,
    )
  ) {
    return 'UNSAFE';
  }

  // Explicit safe signals
  if (
    /\b(safe|drinkable|potable|fine to drink|ok to drink|okay to drink|good to drink|clean|treated)\b/.test(
      s,
    )
  ) {
    return 'SAFE';
  }

  return 'UNKNOWN';
}

// ── Airport / City Transit ────────────────────────────────────────────────────

function parsePrimaryTransit(
  airportTransit?: string,
): BriefingSemantics['primaryTransit'] {
  if (!airportTransit) return 'MIXED';

  const s = airportTransit.toLowerCase();

  // Walking-dominant destinations
  if (
    /\b(walk|on foot|walkable|pedestrian)\b/.test(s) &&
    !/\b(metro|subway|bus|taxi|uber|train|tram|tube)\b/.test(s)
  ) {
    return 'WALKING';
  }

  // Taxi / rideshare dominant
  if (
    /\b(taxi|uber|grab|bolt|rideshare|ride-share|cab)\b/.test(s) &&
    !/\b(metro|subway|bus|train|tram|tube|public)\b/.test(s)
  ) {
    return 'TAXI';
  }

  // Public transport dominant
  if (
    /\b(metro|subway|bus|train|tram|tube|public transport|public transit|rail|brt|mrt|skytrain)\b/.test(
      s,
    )
  ) {
    // If there are also taxi/walk signals alongside public, it's MIXED
    if (/\b(taxi|uber|walk|on foot)\b/.test(s)) {
      return 'MIXED';
    }
    return 'PUBLIC';
  }

  return 'MIXED';
}

// ── English Proficiency / Language Barrier ────────────────────────────────────

function parseLanguageBarrier(
  englishProficiency?: string,
): BriefingSemantics['languageBarrier'] {
  if (!englishProficiency) return 'UNKNOWN';

  const s = englishProficiency.toLowerCase();

  // Low barrier — high English proficiency
  if (
    /\b(widely spoken|widely understood|high|excellent|very good|fluent|most people speak english|english is common|good english|strong english|prevalent)\b/.test(
      s,
    )
  ) {
    return 'LOW';
  }

  // High barrier — low English proficiency
  if (
    /\b(rarely|limited|low|poor|little english|few people speak|not widely|minimal|uncommon|difficult|challenging|hard to communicate)\b/.test(
      s,
    )
  ) {
    return 'HIGH';
  }

  // Medium barrier — moderate proficiency
  if (
    /\b(some|moderate|basic|partial|tourist areas|varies|mixed|depends|younger|hotels|restaurants)\b/.test(
      s,
    )
  ) {
    return 'MEDIUM';
  }

  return 'UNKNOWN';
}

// ── Tipping Etiquette ─────────────────────────────────────────────────────────

function parseTippingNorm(
  tippingEtiquette?: string,
): BriefingSemantics['tippingNorm'] {
  if (!tippingEtiquette) return 'UNKNOWN';

  const s = tippingEtiquette.toLowerCase();

  // No tipping expected
  if (
    /\b(not expected|not customary|not necessary|not required|not common|unusual|rude|offensive|no tip|no tipping|tipping is not|don't tip|do not tip|service included|included in the bill)\b/.test(
      s,
    )
  ) {
    return 'NONE';
  }

  // Percentage-based tipping
  if (
    /\b(\d+\s*%|percent|percentage|10%|15%|20%|standard tip|customary tip|expected tip)\b/.test(
      s,
    )
  ) {
    return 'PERCENTAGE';
  }

  // Round-up / small tip convention
  if (
    /\b(round up|round-up|rounding|small tip|loose change|spare change|appreciated|optional|modest|a little|a few|coins)\b/.test(
      s,
    )
  ) {
    return 'ROUND_UP';
  }

  // Generic "tip is expected" without specifics → PERCENTAGE as safer default
  if (
    /\b(tip|gratuity|tipping is common|tipping is customary|tipping is expected|tipping is standard)\b/.test(
      s,
    )
  ) {
    return 'PERCENTAGE';
  }

  return 'UNKNOWN';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Converts raw AI-generated `CityEssentials` text fields into a strict
 * `BriefingSemantics` object with uppercase union-type values.
 *
 * This is a pure function — it never throws and always returns a complete
 * `BriefingSemantics` object, falling back to 'UNKNOWN' / 'MIXED' on any
 * unrecognised or missing input.
 */
export function parseBriefingSemantics(
  essentials?: Partial<CityEssentials>,
): BriefingSemantics {
  return {
    tapWaterStatus: parseTapWaterStatus(essentials?.tapWater),
    primaryTransit: parsePrimaryTransit(essentials?.airportTransit),
    languageBarrier: parseLanguageBarrier(essentials?.englishProficiency),
    tippingNorm: parseTippingNorm(essentials?.tippingEtiquette),
  };
}
