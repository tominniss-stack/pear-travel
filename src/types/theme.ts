// ── Headless Theme Architecture: Shared Type Contracts ───────────────────────
// This file is the single source of truth for all theme-related interfaces.
// Import these types in any theme component to ensure strict contract compliance.

import type { Itinerary } from '@/types';

// ── Re-exported from ItineraryDisplayNotebook.tsx ────────────────────────────
// Centralised here so all themes share the same ClientTripProps shape.
export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake?: any;
}

// ── Semantic Union Types ──────────────────────────────────────────────────────
// Strict, uppercase string literals derived from raw AI text by briefingParser.

export interface BriefingSemantics {
  /** Whether tap water is safe to drink at the destination. */
  tapWaterStatus: 'SAFE' | 'UNSAFE' | 'UNKNOWN';

  /** The dominant transit mode for getting around the destination. */
  primaryTransit: 'PUBLIC' | 'TAXI' | 'WALKING' | 'MIXED';

  /** The level of English proficiency / language barrier at the destination. */
  languageBarrier: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

  /** The local tipping convention. */
  tippingNorm: 'NONE' | 'ROUND_UP' | 'PERCENTAGE' | 'UNKNOWN';
}

// ── ThemeProps ────────────────────────────────────────────────────────────────
// The canonical prop contract every theme component must satisfy.
// Callbacks for Ledger and Edit are handled via routing, not modal state.

export interface ThemeProps {
  trip: ClientTripProps;
  itinerary: Itinerary;
  briefing: BriefingSemantics;
  totalCostGBP: number;
  basecamps: { name: string; startDay: number }[];
  onOpenLedger: () => void;
  onOpenDocs: () => void;
  onOpenCalendar: () => void;
  onEditTrip: () => void;
}
