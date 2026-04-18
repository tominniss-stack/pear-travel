'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import SortableItinerary from '@/components/itinerary/SortableItinerary';
import ItineraryDisplay from '@/components/itinerary/ItineraryDisplay';
import ItineraryDisplayV2 from '@/components/itinerary/ItineraryDisplayV2';
import ItineraryDisplayNotebook from '@/components/itinerary/ItineraryDisplayNotebook';
import ItineraryDisplayTerminal from '@/components/itinerary/ItineraryDisplayTerminal';
import CalendarExportModal from '@/components/itinerary/CalendarExportModal';
import FilingCabinet from '@/components/itinerary/FilingCabinet';
import ThemeInjector from '@/components/layout/ThemeInjector';
import type { Itinerary, TripIntake } from '@/types';
import type { DocumentInfo } from '@/components/itinerary/PlaceDetailsModal';
import { useTripStore } from '@/store/tripStore';
import { useUIStore } from '@/store/uiStore';
import { parseBriefingSemantics } from '@/lib/briefingParser';
import { fetchTripDocuments } from '@/app/actions/documents';

export interface ClientTripProps {
  id: string;
  destination: string;
  duration: number;
  budgetGBP: number;
  startDate: string | null;
  endDate: string | null;
  intake: TripIntake;
}

interface ItineraryPageClientProps {
  dbTrip: ClientTripProps;
  dbItinerary: Itinerary;
}

export default function ItineraryPageClient({ dbTrip, dbItinerary }: ItineraryPageClientProps) {
  const router = useRouter();

  // ── Trip Store ──────────────────────────────────────────────────────────────
  const setItinerary = useTripStore((state) => state.setItinerary);
  const setIntake = useTripStore((state) => state.setIntake);
  const setCurrentTripId = useTripStore((state) => state.setCurrentTripId);
  const itinerary = useTripStore((state) => state.itinerary);
  const aestheticPreference = useTripStore((state) => state.aestheticPreference);

  // ── UI Store ────────────────────────────────────────────────────────────────
  const activeModal = useUIStore((s) => s.activeModal);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);

  // ── Local State ─────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [tripDocuments, setTripDocuments] = useState<DocumentInfo[]>([]);

  // ── Hydration ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    setItinerary(dbItinerary);
    setIntake(dbTrip.intake);
    setCurrentTripId(dbTrip.id);
  }, [dbItinerary, dbTrip, setItinerary, setIntake, setCurrentTripId]);

  // ── Document Loader ─────────────────────────────────────────────────────────
  const loadDocuments = useCallback(() => {
    if (dbTrip?.id) {
      fetchTripDocuments(dbTrip.id).then((docs) =>
        setTripDocuments(docs as DocumentInfo[]),
      );
    }
  }, [dbTrip?.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ── Semantic Engine ─────────────────────────────────────────────────────────
  const briefing = useMemo(
    () => parseBriefingSemantics(itinerary?.essentials),
    [itinerary?.essentials],
  );

  // ── ThemeProps Callbacks ────────────────────────────────────────────────────
  const handleOpenLedger = useCallback(() => {
    router.push(`/itinerary/${dbTrip.id}/ledger`);
  }, [router, dbTrip.id]);

  const handleOpenDocs = useCallback(() => {
    openModal('docs');
  }, [openModal]);

  const handleOpenCalendar = useCallback(() => {
    openModal('calendar');
  }, [openModal]);

  const handleEditTrip = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSaveItinerary = async () => {
    if (!itinerary || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/trip/${dbTrip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itinerary }),
      });

      if (!response.ok) throw new Error(`Failed to save: ${response.statusText}`);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving itinerary:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentItinerary = itinerary || dbItinerary;

  // ── POI reference list for FilingCabinet ────────────────────────────────────
  const availablePOIs = useMemo(
    () =>
      currentItinerary?.days?.flatMap((d) =>
        d.entries.map((e) => ({
          id: e.id,
          name: e.locationName,
          dayName: `Day ${d.dayNumber}`,
        })),
      ) ?? [],
    [currentItinerary],
  );

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 w-full animate-pulse" />;
  }

  return (
    <div className="w-full py-8 relative">
      <ThemeInjector />

      {/* ── DYNAMIC HEADER BAR ── */}
      {isEditing ? (
        // STATE 1: EDITING MODE (Abort vs Save)
        <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center text-sm font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            <span aria-hidden="true" className="mr-2">✕</span>
            Abort Changes
          </button>

          <button
            type="button"
            onClick={handleSaveItinerary}
            disabled={isSaving}
            className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-brand-500 text-white hover:bg-brand-400 border border-brand-400"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      ) : (
        // STATE 2: VIEWING MODE (Hide entirely for Terminal so it stays immersive)
        aestheticPreference !== 'TERMINAL' && (
          <div className="print:hidden mb-6 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <span aria-hidden="true" className="mr-2">←</span>
              Back to My Trips
            </Link>

            {/* Hide the standard Edit button for Notebook since it provides its own native UI tab */}
            {aestheticPreference !== 'NOTEBOOK' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                >
                  Edit Trip Planner
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* ── THEME ENGINE ROUTING ── */}
      {isEditing ? (
        <SortableItinerary />
      ) : (
        aestheticPreference === 'TERMINAL' ? (
          /* Phase 3 will migrate ItineraryDisplayTerminal to ThemeProps */
          (() => {
            const C = ItineraryDisplayTerminal as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditAction={handleEditTrip} />;
          })()
        ) : aestheticPreference === 'NOTEBOOK' ? (
          /* Phase 3 will migrate ItineraryDisplayNotebook to ThemeProps */
          (() => {
            const C = ItineraryDisplayNotebook as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditAction={handleEditTrip} />;
          })()
        ) : aestheticPreference === 'EDITORIAL' ? (
          /* Phase 3 will migrate ItineraryDisplayV2 to ThemeProps */
          (() => {
            const C = ItineraryDisplayV2 as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditRequest={handleEditTrip} />;
          })()
        ) : (
          /* Phase 3 will migrate ItineraryDisplay to ThemeProps */
          (() => {
            const C = ItineraryDisplay as any;
            return <C itinerary={currentItinerary} trip={dbTrip} briefing={briefing} onOpenLedger={handleOpenLedger} onOpenDocs={handleOpenDocs} onOpenCalendar={handleOpenCalendar} onEditTrip={handleEditTrip} onEditRequest={handleEditTrip} />;
          })()
        )
      )}

      {/* ── ROOT-LEVEL MODALS (owned by the Brain, not by themes) ── */}
      <FilingCabinet
        isOpen={activeModal === 'docs'}
        onClose={closeModal}
        tripId={dbTrip.id}
        availablePOIs={availablePOIs}
        documents={tripDocuments}
        onUploadSuccess={loadDocuments}
      />
      <CalendarExportModal
        isOpen={activeModal === 'calendar'}
        onClose={closeModal}
        itinerary={currentItinerary}
        trip={dbTrip}
      />
    </div>
  );
}