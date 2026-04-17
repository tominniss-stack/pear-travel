'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  DndContext, DragOverlay, TouchSensor, MouseSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent, type UniqueIdentifier, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { useHydratedTripStore, useTripStore } from '@/store/tripStore';
import { recalculateDay } from '@/lib/itinerary/recalc';
import { minifyItineraryContext } from '@/lib/itinerary/serialization';
import type { DayItinerary, DayOverride, DailyPacing, ItineraryEntry, TransitMethod, MinifiedTimelineItem } from '@/types';
import PlaceDetailsModal from './PlaceDetailsModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCost(cost?: number): string {
  if (cost === undefined || cost === null) return '—';
  if (cost === 0) return 'Free';
  return `£${cost.toLocaleString('en-GB')}`;
}

function getDayContainerId(dayNumber: number): UniqueIdentifier { return `day-${dayNumber}`; }

function recalcSpend(entries: ItineraryEntry[]): number { 
  return entries.reduce((sum, e) => sum + (e.estimatedCostGBP ?? 0), 0); 
}

function getGoogleMapsTravelMode(method?: string) {
  if (!method) return 'transit';
  const m = method.toLowerCase();
  if (m.includes('walk')) return 'walking';
  if (m.includes('cycl') || m.includes('bike')) return 'bicycling';
  if (m.includes('taxi') || m.includes('car') || m.includes('drive')) return 'driving';
  return 'transit';
}

function generateGoogleMapsDayUrl(entries: ItineraryEntry[], destinationCity: string): string | null {
  const validEntries = entries.filter(e => 
    e.locationName && 
    !/(airport|flight|arrival|departure)/i.test(e.locationName + ' ' + (e.activityDescription || '')) &&
    e.locationName !== 'Room Break' && 
    e.locationName !== 'Local Coffee / Cafe Break'
  );
  
  if (validEntries.length === 0) return null;
  if (validEntries.length === 1) {
     const placeIdParam = validEntries[0].placeId && validEntries[0].placeId !== "null" ? `&query_place_id=${validEntries[0].placeId}` : '';
     return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(validEntries[0].locationName + ', ' + destinationCity)}${placeIdParam}`;
  }
  
  const origin = validEntries[0];
  const dest = validEntries[validEntries.length - 1];
  const waypoints = validEntries.slice(1, -1);
  
  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${encodeURIComponent(origin.locationName + ', ' + destinationCity)}`;
  if (origin.placeId && origin.placeId !== "null") url += `&origin_place_id=${origin.placeId}`;
  
  url += `&destination=${encodeURIComponent(dest.locationName + ', ' + destinationCity)}`;
  if (dest.placeId && dest.placeId !== "null") url += `&destination_place_id=${dest.placeId}`;
  
  if (waypoints.length > 0) {
     const limitedWaypoints = waypoints.slice(0, 9); // Google Maps limit
     url += `&waypoints=${limitedWaypoints.map(w => encodeURIComponent(w.locationName + ', ' + destinationCity)).join('|')}`;
     const wpPlaceIds = limitedWaypoints.map(w => (w.placeId && w.placeId !== "null") ? w.placeId : '');
     if (wpPlaceIds.some(id => id !== '')) {
         url += `&waypoint_place_ids=${wpPlaceIds.join('|')}`;
     }
  }
  return url;
}

const TRANSIT_CONFIG: Record<TransitMethod, { emoji: string; colour: string; bgColour: string }> = {
  'Walking':          { emoji: '🚶', colour: 'text-emerald-700 dark:text-emerald-400', bgColour: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' },
  'Tube':             { emoji: '🚇', colour: 'text-blue-700 dark:text-blue-400',    bgColour: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'       },
  'Bus':              { emoji: '🚌', colour: 'text-orange-700 dark:text-orange-400',  bgColour: 'bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800'   },
  'Metro':            { emoji: '🚊', colour: 'text-purple-700 dark:text-purple-400',  bgColour: 'bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800'   },
  'Tram':             { emoji: '🚋', colour: 'text-teal-700 dark:text-teal-400',    bgColour: 'bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800'       },
  'Taxi / Rideshare': { emoji: '🚕', colour: 'text-yellow-700 dark:text-yellow-400',  bgColour: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800'   },
  'Train':            { emoji: '🚂', colour: 'text-red-700 dark:text-red-400',     bgColour: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'         },
  'Ferry':            { emoji: '⛴️', colour: 'text-cyan-700 dark:text-cyan-400',    bgColour: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/30 dark:border-cyan-800'       },
  'Cycling':          { emoji: '🚲', colour: 'text-lime-700 dark:text-lime-400',    bgColour: 'bg-lime-50 border-lime-200 dark:bg-lime-900/30 dark:border-lime-800'       },
  'Start of Day':     { emoji: '🌅', colour: 'text-slate-700 dark:text-slate-400',   bgColour: 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'     },
};

function getTransitConfig(method?: TransitMethod) { return TRANSIT_CONFIG[method ?? 'Start of Day'] ?? TRANSIT_CONFIG['Start of Day']; }

type ModalTarget = { entry: ItineraryEntry; dayNumber: number } | null;

// ── Modals ───────────────────────────────────────────────────────────────────

function AddActivityModal({ dayNumber, destination, onClose }: { dayNumber: number; destination: string; onClose: () => void }) {
  const addCustomEntry = useTripStore((state) => state.addCustomEntry);
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<{name: string, placeId: string, url: string} | null>(null);
  const [time, setTime] = useState('');
  const [cost, setCost] = useState('');
  const [isDining, setIsDining] = useState(false);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  useEffect(() => {
    const googleObj = (typeof window !== 'undefined') ? (window as any).google : null;
    if (googleObj?.maps?.places) {
      autocompleteService.current = new googleObj.maps.places.AutocompleteService();
      placesService.current = new googleObj.maps.places.PlacesService(document.createElement('div'));
    }
  }, []);

  useEffect(() => {
    if (!query || selectedPlace) { setPredictions([]); return; }
    const biasedQuery = `${query} in ${destination}`;
    const googleObj = (window as any).google;
    if (autocompleteService.current && googleObj) {
      autocompleteService.current.getPlacePredictions({ input: biasedQuery }, (results: any[], status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK && results) setPredictions(results);
        else setPredictions([]);
      });
    }
  }, [query, destination, selectedPlace]);

  const handleSelectPlace = (placeId: string, description: string) => {
    setQuery(description);
    const googleObj = (window as any).google;
    if (placesService.current && googleObj) {
      placesService.current.getDetails({ placeId, fields: ['name', 'url', 'types'] }, (place: any, status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK && place) {
          setSelectedPlace({ name: place.name || description, placeId, url: place.url || '' });
          if (place.types?.some((t: string) => t === 'restaurant' || t === 'cafe')) setIsDining(true);
        }
      });
    }
    setPredictions([]);
  };

  const handleSave = () => {
    addCustomEntry(dayNumber, {
      locationName: selectedPlace?.name || query,
      time: time || undefined,
      estimatedCostGBP: Number(cost) || 0,
      isDining,
      placeId: selectedPlace?.placeId || '',
      googleMapsUrl: selectedPlace?.url || ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">Add Activity (Day {dayNumber})</h3>
        <div className="relative mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Search Place</label>
          <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setSelectedPlace(null); }} placeholder={`Search in ${destination}...`} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" autoFocus />
          {predictions.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
              {predictions.map((pred) => (
                <button key={pred.place_id} onClick={() => handleSelectPlace(pred.place_id, pred.description)} className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{pred.structured_formatting?.main_text || pred.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Start Time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Est. Cost (£)</label><input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"><input type="checkbox" checked={isDining} onChange={(e) => setIsDining(e.target.checked)} className="rounded text-brand-600 w-4 h-4" /> Mark as Dining / Restaurant</label>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!query.trim()} className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl shadow-sm hover:bg-brand-500 disabled:opacity-50 transition-colors">Add to Trip</button>
        </div>
      </div>
    </div>
  );
}

function AddRestModal({ dayNumber, accommodationName, onClose }: { dayNumber: number; accommodationName?: string; onClose: () => void }) {
  const addCustomEntry = useTripStore((state) => state.addCustomEntry);
  const [restType, setRestType] = useState<'coffee' | 'hotel'>('coffee');

  const handleSave = () => {
    if (restType === 'coffee') {
      addCustomEntry(dayNumber, {
        locationName: 'Local Coffee / Cafe Break',
        activityDescription: 'Take a moment to grab a coffee, rest your feet, and people-watch.',
        transitMethod: 'Walking',
        estimatedCostGBP: 5,
        isDining: false, 
      });
    } else {
      addCustomEntry(dayNumber, {
        locationName: 'Room Break',
        activityDescription: 'Stop by your accommodation to drop off bags and refresh.',
        transitMethod: 'Walking',
        estimatedCostGBP: 0,
        isDining: false,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 text-center">Add a Rest Stop</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">What kind of break do you need?</p>
        
        <div className="flex flex-col gap-3 mb-6">
          <button onClick={() => setRestType('coffee')} className={`p-4 rounded-2xl border-2 text-left transition-all ${restType === 'coffee' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 bg-white dark:bg-slate-800'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">☕</span>
              <div>
                <p className={`font-bold ${restType === 'coffee' ? 'text-brand-700 dark:text-brand-400' : 'text-slate-900 dark:text-white'}`}>Coffee & Snack</p>
                <p className="text-xs text-slate-500 mt-0.5">Find a local cafe to recharge.</p>
              </div>
            </div>
          </button>
          
          <button onClick={() => setRestType('hotel')} className={`p-4 rounded-2xl border-2 text-left transition-all ${restType === 'hotel' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 bg-white dark:bg-slate-800'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏨</span>
              <div>
                <p className={`font-bold ${restType === 'hotel' ? 'text-brand-700 dark:text-brand-400' : 'text-slate-900 dark:text-white'}`}>Return to Room</p>
                <p className="text-xs text-slate-500 mt-0.5">Head back to drop off bags.</p>
              </div>
            </div>
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl shadow-sm hover:bg-brand-500 transition-colors">Add to Timeline</button>
        </div>
      </div>
    </div>
  );
}

function TimeEditorModal({ target, onClose, onSave }: { target: NonNullable<ModalTarget>; onClose: () => void; onSave: (time: string) => void }) {
  const [editTime, setEditTime] = useState(target.entry.time ?? '');
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 text-center">Set Time</h3>
        <p className="text-xs text-slate-500 text-center mb-6 px-4 line-clamp-2">{target.entry.locationName}</p>
        <div className="flex justify-center mb-8">
          <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="text-4xl font-black text-center bg-slate-50 dark:bg-slate-900 text-brand-600 dark:text-brand-400 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 outline-none w-full max-w-[200px]" autoFocus />
        </div>
        <div className="flex gap-3">
          <button onClick={() => onSave('')} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Clear Time</button>
          <button onClick={() => onSave(editTime)} className="flex-1 py-3 font-bold text-white bg-brand-600 rounded-xl shadow-lg hover:bg-brand-500 transition-colors">Save Time</button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteConfirmModal({ target, onClose, onConfirm }: { target: NonNullable<ModalTarget>; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 text-center">Delete Activity?</h3>
        <p className="text-sm text-slate-500 text-center mb-6">Remove <span className="font-bold text-slate-900 dark:text-slate-200">"{target.entry.locationName}"</span>?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl shadow-lg hover:bg-red-500 transition-colors">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

function EditAccommodationModal({ target, destination, onClose, onSave }: { target: NonNullable<ModalTarget>; destination: string; onClose: () => void; onSave: (location: string, time: string, cascade: boolean) => void }) {
  const [query, setQuery] = useState(target.entry.locationName);
  const [time, setTime] = useState(target.entry.time || '');
  const [cascade, setCascade] = useState(true);
  const [predictions, setPredictions] = useState<any[]>([]);
  const autocompleteService = useRef<any>(null);

  useEffect(() => {
    const googleObj = (typeof window !== 'undefined') ? (window as any).google : null;
    if (googleObj?.maps?.places) autocompleteService.current = new googleObj.maps.places.AutocompleteService();
  }, []);

  useEffect(() => {
    if (!query || query === target.entry.locationName) { setPredictions([]); return; }
    const biasedQuery = `${query} in ${destination}`;
    const googleObj = (window as any).google;
    if (autocompleteService.current && googleObj) {
      autocompleteService.current.getPlacePredictions({ input: biasedQuery }, (results: any[], status: any) => {
        if (status === googleObj.maps.places.PlacesServiceStatus.OK && results) setPredictions(results);
        else setPredictions([]);
      });
    }
  }, [query, destination, target.entry.locationName]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">Update Accommodation 🏨</h3>
        <p className="text-xs text-slate-500 mb-6">Modify the start/end logistics for Day {target.dayNumber}.</p>
        
        <div className="relative mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Search New Location</label>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search in ${destination}...`} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" />
          {predictions.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
              {predictions.map((pred) => (
                <button key={pred.place_id} onClick={() => { setQuery(pred.structured_formatting?.main_text || pred.description); setPredictions([]); }} className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{pred.structured_formatting?.main_text || pred.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Start / Return Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white" />
        </div>

        <div className="bg-brand-50 dark:bg-brand-900/10 p-4 rounded-xl border border-brand-200 dark:border-brand-800/50 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="pt-0.5"><input type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} className="rounded text-brand-600 w-4 h-4 cursor-pointer" /></div>
            <div><span className="block text-sm font-bold text-slate-900 dark:text-brand-300">Apply to all following days</span><span className="block text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">Updates future morning/evening bookends to this location.</span></div>
          </label>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => onSave(query, time, cascade)} disabled={!query.trim()} className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl shadow-sm hover:bg-brand-500 disabled:opacity-50 transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
// ── Day Override / Settings Modal ────────────────────────────────────────────

function DayOverrideModal({
  dayNumber,
  existing,
  onClose,
  onSave,
}: {
  dayNumber: number;
  existing?: DayOverride;
  onClose: () => void;
  onSave: (dayNumber: number, override: DayOverride) => void;
}) {
  const [pacing, setPacing] = useState<DailyPacing | 'global'>(existing?.pacing ?? 'global');
  const [startTime, setStartTime] = useState<string>(existing?.startTime ?? '');
  const [hardcodedEvents, setHardcodedEvents] = useState<string>(existing?.hardcodedEvents ?? '');

  const handleSave = () => {
    const override: DayOverride = {};
    if (pacing !== 'global') override.pacing = pacing;
    if (startTime.trim()) override.startTime = startTime.trim();
    if (hardcodedEvents.trim()) override.hardcodedEvents = hardcodedEvents.trim();
    onSave(dayNumber, override);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700/80 overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚙️</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Day {dayNumber} Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 flex flex-col gap-5">

          {/* Override Pace */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              Override Pace
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['global', 'relaxed', 'moderate', 'intensive'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPacing(opt)}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold capitalize border transition-all ${
                    pacing === opt
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  {opt === 'global' ? 'Default' : opt}
                </button>
              ))}
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              Start Time
              <span className="ml-1.5 normal-case font-normal text-slate-400 dark:text-slate-600">(leave blank for global default)</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white/20 transition-shadow"
            />
          </div>

          {/* Fixed Events */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              Fixed Events
              <span className="ml-1.5 normal-case font-normal text-slate-400 dark:text-slate-600">(used when regenerating)</span>
            </label>
            <textarea
              value={hardcodedEvents}
              onChange={(e) => setHardcodedEvents(e.target.value)}
              rows={3}
              placeholder={"e.g. Dinner reservation at Dishoom at 20:00\nMuseum tickets booked for 14:00"}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white/20 resize-none transition-shadow leading-relaxed"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-100 shadow-sm transition-colors"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Item Component (Zoned Interactions) ─────────────────────────────────────

function SortableTimelineEntry({ 
  entry, nextEntry, containerId, isDraggingGlobal, dayNumber, isParkingLot, accommodationName, destination, onPlaceClick, onEditTime, onDeleteRequest, onToggleFixed, onEditAccommodation 
}: { 
  entry: ItineraryEntry; nextEntry?: ItineraryEntry; containerId: UniqueIdentifier; isDraggingGlobal: boolean; dayNumber: number; isParkingLot: boolean; accommodationName?: string; destination: string;
  onPlaceClick: (placeId: string, poiId: string, aiNote?: string) => void; onEditTime: (target: NonNullable<ModalTarget>) => void; onDeleteRequest: (target: NonNullable<ModalTarget>) => void;
  onToggleFixed: (dayNumber: number, entryId: string) => void; onEditAccommodation: (target: NonNullable<ModalTarget>) => void;
}) {

  const isManualRest = entry.locationName === 'Room Break' || entry.locationName === 'Local Coffee / Cafe Break';
  const isBookend = !isManualRest && (entry.type === 'ACCOMMODATION' || entry.transitMethod === 'Start of Day' || /(accommodation|hotel|airbnb|start of day|return to)/i.test(entry.activityDescription || '') || /(accommodation|hotel|airbnb|start of day|return to)/i.test(entry.locationName || '')) && !entry.isDining;
  const isFlight = /(airport|flight|departure)/i.test(entry.activityDescription || '') || /(airport|flight|departure)/i.test(entry.locationName || '');
  const isStay = isBookend && !isFlight;

  const [showActions, setShowActions] = useState(false);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ 
    id: entry.id, data: { type: 'entry', containerId }, disabled: isBookend || entry.isFixed || showActions
  });
  
  const dndStyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };

  const rawDesc = entry.activityDescription || '';
  const annotationMatch = rawDesc.match(/^\[(.*?)\]/);
  const annotation = annotationMatch ? annotationMatch[1] : null;

  let displayTitle = entry.locationName || 'Unknown Location';
  let displayDesc = rawDesc.replace(/^\[.*?\]\s*/, '');

  if (isStay) {
    const isGeneric = /^(accommodation|hotel|airbnb|start of day|return to)/i.test(displayTitle.trim());
    if (isGeneric && accommodationName) displayTitle = accommodationName;
  }

  const nextTransitConfig = getTransitConfig(nextEntry?.transitMethod);

  return (
    <>
      <div ref={setNodeRef} style={dndStyle} className={`mb-3 w-full group/entry select-none outline-none ${isDragging ? 'opacity-50' : ''}`}>
        
        {/* ── THE CARD ── */}
        <div
          className={`relative z-10 flex w-full items-stretch rounded-2xl border shadow-sm transition-all ${
            isDragging ? 'scale-[0.98] ring-2 ring-brand-500 cursor-grabbing' : 'bg-white dark:bg-slate-800'
          } ${
            entry.requiresReschedule
              ? 'border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-900/10 ring-1 ring-amber-300/50 dark:ring-amber-700/30'
              : entry.isFixed
              ? 'border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-900/10'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          {/* Column 1: Time & Pin */}
          {!isParkingLot && (
            <div className="flex flex-col items-center justify-center w-16 md:w-20 py-3 flex-shrink-0 border-r border-slate-100 dark:border-slate-700/50 relative bg-inherit rounded-l-2xl">
              {entry.timeWarning && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border border-red-200 dark:border-red-800/50 z-20" title={entry.timeWarning}>
                  ⚠️ {entry.timeWarning.includes('Closes') ? 'CLOSES' : 'CLOSED'}
                </div>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); if (!isBookend) onEditTime({ entry, dayNumber }); }}
                className={`text-sm tabular-nums font-bold mt-1 ${entry.isFixed ? 'text-brand-600' : isBookend ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}
              >
                {entry.time || '--:--'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onToggleFixed(dayNumber, entry.id); }} className="mt-1 p-1 text-xs">
                {isBookend ? '🔒' : entry.isFixed ? '📌' : '📍'}
              </button>
            </div>
          )}

          {/* Column 2: Drag Area & Content */}
          <div 
            ref={setActivatorNodeRef}
            {...attributes} {...listeners}
            // ── FIX: Added conditional rounded corners for Parking Lot ──
            className={`flex-1 min-w-0 p-4 bg-inherit ${isParkingLot ? 'rounded-l-2xl' : ''} ${!isBookend && !entry.isFixed ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            {isParkingLot && entry.requiresReschedule && (
              <div className="mb-1.5 flex items-center">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 shadow-sm">⚠️ Reschedule Required</span>
              </div>
            )}
            {isParkingLot && !entry.requiresReschedule && annotation && (
              <div className="mb-1.5 flex items-center">
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50 shadow-sm">✨ AI Note</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3 mb-1">
              <h4 
                onClick={(e) => { e.stopPropagation(); if (entry.placeId) onPlaceClick(entry.placeId, entry.id, annotation || undefined); }} 
                className={`text-sm font-bold line-clamp-2 leading-tight relative z-20 ${entry.placeId ? 'text-brand-600 dark:text-brand-400 hover:underline cursor-pointer' : 'text-slate-900 dark:text-white'}`}
              >
                {displayTitle}
              </h4>
              {!/(Accommodation|Hotel|Airbnb|Start|Return)/i.test(entry.locationName ?? '') && entry.estimatedCostGBP > 0 && (
                <span className="flex-shrink-0 text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600">{formatCost(entry.estimatedCostGBP)}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{displayDesc}</p>
          </div>

          {/* Column 3: Actions (The Three Dots) */}
          <div className="flex flex-col border-l border-slate-100 dark:border-slate-700/50 bg-inherit rounded-r-2xl w-12 flex-shrink-0">
            {isBookend ? (
               <button onClick={(e) => { e.stopPropagation(); onEditAccommodation({ entry, dayNumber }); }} className="flex-1 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-r-2xl transition-colors" title="Edit Accommodation & Time">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
               </button>
            ) : entry.isFixed ? (
               <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/30 rounded-r-2xl" />
            ) : (
               <button 
                 onClick={(e) => { e.stopPropagation(); setShowActions(true); }} 
                 className="flex-1 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-r-2xl transition-colors active:bg-slate-100"
               >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
               </button>
            )}
          </div>
        </div>

        {/* ── TRANSIT SIBLING (Unchanged, clean placement) ── */}
        {!isParkingLot && nextEntry && (
          <div className="flex gap-4 pl-[78px] py-1 relative z-0">
            <div className="flex w-6 flex-col items-center flex-shrink-0"><div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 min-h-[32px]" /></div>
            <div className="flex flex-col justify-center py-2 relative z-20">
              {nextEntry.transitNote && (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(displayTitle + ', ' + destination)}&destination=${encodeURIComponent(nextEntry.locationName + ', ' + destination)}&travelmode=${getGoogleMapsTravelMode(nextEntry.transitMethod)}`}
                  target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-[10px] font-bold px-2.5 py-1 rounded-lg border hover:scale-[1.02] hover:shadow-sm transition-all shadow-sm ${nextTransitConfig.bgColour} ${nextTransitConfig.colour}`}
                  title={`Get directions to ${nextEntry.locationName}`}
                >
                  <span>{nextTransitConfig.emoji}</span><span>{nextEntry.transitNote}</span><span className="ml-0.5 opacity-50">↗</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ACTION SHEET MODAL ── */}
      <AnimatePresence>
        {showActions && (
          <div className="fixed inset-0 z-[600] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-4" onClick={(e) => { e.stopPropagation(); setShowActions(false); }}>
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 text-center px-4 line-clamp-1">{displayTitle}</h3>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { setShowActions(false); onEditTime({ entry, dayNumber }); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 text-slate-900 dark:text-white font-bold transition-colors border border-slate-100 dark:border-slate-700"
                >
                  <span className="text-xl">⏱️</span> Edit Time
                </button>

                <button 
                  onClick={() => { setShowActions(false); onToggleFixed(dayNumber, entry.id); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold transition-colors border border-slate-100 dark:border-slate-700"
                >
                  <span className="text-xl">{entry.isFixed ? '🔓' : '📌'}</span> {entry.isFixed ? 'Unpin Activity' : 'Pin Activity (Lock Time)'}
                </button>

                <button 
                  onClick={() => { setShowActions(false); onDeleteRequest({ entry, dayNumber }); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-bold transition-colors border border-red-100 dark:border-red-900/50"
                >
                  <span className="text-xl">🗑️</span> Delete Activity
                </button>
              </div>

              <button 
                onClick={() => setShowActions(false)}
                className="w-full mt-4 py-4 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
// ── Drop Zone Components ───────────────────────────────────────────────────

function DayColumn({
  day, anyDragActive, accommodationName, destination, onAddActivity, onAddRest, onPlaceClick, onEditTime, onDeleteRequest, onToggleFixed, onEditAccommodation, onDaySettings, onRegenerateDay, activeOverride, isRegenerating
}: {
  day: DayItinerary; anyDragActive: boolean; accommodationName?: string; destination: string;
  onAddActivity: (n: number) => void; onAddRest: (n: number) => void; onPlaceClick: (placeId: string, poiId: string, note?: string) => void;
  onEditTime: (t: NonNullable<ModalTarget>) => void; onDeleteRequest: (t: NonNullable<ModalTarget>) => void;
  onToggleFixed: (dayNumber: number, entryId: string) => void; onEditAccommodation: (t: NonNullable<ModalTarget>) => void;
  onDaySettings: (dayNumber: number) => void; onRegenerateDay: (dayNumber: number) => void;
  activeOverride?: DayOverride; isRegenerating?: boolean;
}) {
  const containerId = getDayContainerId(day.dayNumber);
  const { setNodeRef, isOver } = useDroppable({ id: containerId });
  const mapUrl = generateGoogleMapsDayUrl(day.entries, destination);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-sm shadow-md">{day.dayNumber}</div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Day {day.dayNumber}</h3>
          {/* Active override indicator */}
          {activeOverride && Object.keys(activeOverride).length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
              ⚙️ Custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Regenerate Day button */}
          <button
            onClick={() => onRegenerateDay(day.dayNumber)}
            disabled={isRegenerating}
            className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm"
            title={`Regenerate Day ${day.dayNumber} (pinned items are preserved)`}
          >
            {isRegenerating ? (
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-4.43"/></svg>
            )}
            {isRegenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
          {/* Day Settings button */}
          <button
            onClick={() => onDaySettings(day.dayNumber)}
            className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
            title={`Configure Day ${day.dayNumber} pacing & start time`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
            Day Settings
          </button>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
              Map Route
            </a>
          )}
        </div>
      </div>
      <div ref={setNodeRef} className={`p-4 rounded-3xl border-2 transition-all min-h-[100px] ${anyDragActive ? 'border-brand-300 dark:border-brand-600 bg-brand-50/20 border-dashed' : 'border-transparent bg-slate-50/50 dark:bg-slate-800/30'} ${isOver ? 'ring-4 ring-brand-200' : ''}`}>
        <SortableContext id={containerId as string} items={day.entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {day.entries.map((entry, idx) => (
            <SortableTimelineEntry key={entry.id} entry={entry} nextEntry={day.entries[idx+1]} dayNumber={day.dayNumber} containerId={containerId} accommodationName={accommodationName} destination={destination} isDraggingGlobal={anyDragActive} isParkingLot={false} onPlaceClick={onPlaceClick} onEditTime={onEditTime} onDeleteRequest={onDeleteRequest} onToggleFixed={onToggleFixed} onEditAccommodation={onEditAccommodation} />
          ))}
          <div className="flex gap-3 mt-4">
            <button onClick={() => onAddActivity(day.dayNumber)} className="flex-1 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black uppercase text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all bg-white dark:bg-slate-800">+ Add Activity</button>
            <button onClick={() => onAddRest(day.dayNumber)} className="flex-1 py-3 border-2 border-dashed border-brand-200 dark:border-brand-800/50 rounded-xl text-xs font-black uppercase text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all bg-white dark:bg-slate-800">🛏️ Add Rest Stop</button>
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function ParkingLot({
  items, anyDragActive, accommodationName, destination, onPlaceClick, onEditTime, onDeleteRequest, onToggleFixed, onEditAccommodation, onDiscoverMore
}: {
  items: ItineraryEntry[]; anyDragActive: boolean; accommodationName?: string; destination: string; onPlaceClick: (placeId: string, poiId: string, note?: string) => void; onEditTime: (t: NonNullable<ModalTarget>) => void;
  onDeleteRequest: (t: NonNullable<ModalTarget>) => void; onToggleFixed: (dayNumber: number, entryId: string) => void;
  onEditAccommodation: (t: NonNullable<ModalTarget>) => void; onDiscoverMore: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'parking-lot' });

  // ── Sort: requiresReschedule items float to the top ──
  const sortedItems = [...items].sort((a, b) => {
    if (a.requiresReschedule && !b.requiresReschedule) return -1;
    if (!a.requiresReschedule && b.requiresReschedule) return 1;
    return 0;
  });

  const rescheduleCount = items.filter(i => i.requiresReschedule).length;

  return (
    <div className="sticky top-24 flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">The Parking Lot</h3>
          {rescheduleCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
              ⚠️ {rescheduleCount} need rescheduling
            </span>
          )}
        </div>
        <button onClick={onDiscoverMore} className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-900/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm"><span>+</span> Discover More</button>
      </div>
      <div ref={setNodeRef} className={`p-4 rounded-3xl border-2 min-h-[250px] transition-all ${anyDragActive ? 'border-brand-300 bg-brand-50/20 border-dashed' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-xl'} ${isOver ? 'ring-4 ring-brand-200' : ''}`}>
        <SortableContext id="parking-lot" items={sortedItems.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {sortedItems.length === 0 ? (
            <div className="py-20 text-center px-6"><p className="text-xs text-slate-400 font-medium">Drag unpinned activities here to un-schedule them.</p></div>
          ) : (
            <>
              {rescheduleCount > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/50" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 whitespace-nowrap">⚠️ Reschedule Required</span>
                  <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/50" />
                </div>
              )}
              {sortedItems.map((entry, idx) => {
                // Insert a divider between reschedule and aspirational sections
                const prevEntry = sortedItems[idx - 1];
                const showDivider = idx > 0 && !entry.requiresReschedule && prevEntry?.requiresReschedule;
                return (
                  <React.Fragment key={entry.id}>
                    {showDivider && (
                      <div className="my-3 flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Aspirational</span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      </div>
                    )}
                    <SortableTimelineEntry entry={entry} dayNumber={-1} containerId="parking-lot" accommodationName={accommodationName} destination={destination} isDraggingGlobal={anyDragActive} isParkingLot={true} onPlaceClick={onPlaceClick} onEditTime={onEditTime} onDeleteRequest={onDeleteRequest} onToggleFixed={onToggleFixed} onEditAccommodation={onEditAccommodation} />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Main Controller ─────────────────────────────────────────────────────────

export default function SortableItinerary() {
  const router = useRouter();
  const params = useParams();
  const urlTripId = params.id as string;
  
  const intake = useHydratedTripStore((state) => state.intake);
  const itinerary = useHydratedTripStore((state) => state.itinerary);
  const currentTripId = useHydratedTripStore((state) => state.currentTripId);
  
  const setItinerary = useTripStore((state) => state.setItinerary);
  const updateEntryTime = useTripStore((state) => state.updateEntryTime);
  const toggleEntryFixed = useTripStore((state) => state.toggleEntryFixed);
  const updateAccommodation = useTripStore((state) => state.updateAccommodation);
  
  const [activeEntry, setActiveEntry] = useState<ItineraryEntry | null>(null);
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [addingRestToDay, setAddingRestToDay] = useState<number | null>(null);
  const [editingTimeTarget, setEditingTimeTarget] = useState<ModalTarget>(null);
  const [editingAccTarget, setEditingAccTarget] = useState<ModalTarget>(null);
  const [deletingTarget, setDeletingTarget] = useState<ModalTarget>(null);

  // ── Day Override state ──
  const [daySettingsTarget, setDaySettingsTarget] = useState<number | null>(null);
  const [localDayOverrides, setLocalDayOverrides] = useState<Record<number, DayOverride>>(
    itinerary?.dayOverrides ?? {}
  );

  // ── Regenerate Day state ──
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);

  // ── Clash Interceptor state ──
  const [pendingDayData, setPendingDayData] = useState<{ day: DayItinerary; ejectedItems: MinifiedTimelineItem[] } | null>(null);
  const [clashModalOpen, setClashModalOpen] = useState(false);

  const handleSaveDayOverride = useCallback((dayNumber: number, override: DayOverride) => {
    setLocalDayOverrides(prev => ({ ...prev, [dayNumber]: override }));
    // TODO: persist to Zustand / database in a future phase
  }, []);

  const handleRegenerateDay = useCallback(async (dayNumber: number) => {
    if (!itinerary || !currentTripId || regeneratingDay !== null) return;

    const day = itinerary.days.find(d => d.dayNumber === dayNumber);
    if (!day) return;

    // Build the minified locked-items payload — only pinned entries are sent
    const lockedTimelineItems = minifyItineraryContext(day);
    // Pass the active day override (if any) so the AI can honour fixed events
    const dayOverride = localDayOverrides[dayNumber];

    setRegeneratingDay(dayNumber);
    try {
      const response = await fetch(`/api/itinerary/${currentTripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber, lockedTimelineItems, dayOverride }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Regenerate day failed:', err);
        return;
      }

      const responseData = await response.json() as { day: DayItinerary; ejectedItems?: MinifiedTimelineItem[] };
      if (!responseData?.day) return;

      // ── Clash Interceptor: if the AI ejected pinned items, intercept before applying ──
      if (responseData.ejectedItems && responseData.ejectedItems.length > 0) {
        setPendingDayData({ day: responseData.day, ejectedItems: responseData.ejectedItems });
        setClashModalOpen(true);
        // Do NOT update the timeline yet — wait for user decision
        return;
      }

      // No clash — apply immediately
      setItinerary({
        ...itinerary,
        days: itinerary.days.map(d => d.dayNumber === dayNumber ? responseData.day : d),
      });
    } catch (err) {
      console.error('Regenerate day error:', err);
    } finally {
      setRegeneratingDay(null);
    }
  }, [itinerary, currentTripId, regeneratingDay, localDayOverrides, setItinerary]);

  // ── Clash Interceptor: Accept — move ejected items to staging, apply new day ──
  const handleClashAccept = useCallback(() => {
    if (!pendingDayData || !itinerary) return;

    const { day: newDay, ejectedItems } = pendingDayData;

    // Convert ejected MinifiedTimelineItems into ItineraryEntry objects for the parking lot
    const ejectedEntries: ItineraryEntry[] = ejectedItems.map((item) => ({
      id: item.id,
      type: 'ACTIVITY' as const,
      time: item.startTime,
      locationName: item.title,
      activityDescription: `Previously pinned activity removed due to a schedule conflict with a fixed external event.`,
      transitMethod: 'Walking' as const,
      estimatedCostGBP: 0,
      googleMapsUrl: item.location.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${item.location.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location.name)}`,
      placeId: item.location.placeId ?? '',
      isDining: false,
      isFixed: false,
      requiresReschedule: true, // ← Clash Interceptor flag
    }));

    const existingUnscheduled = itinerary.unscheduledOptions ?? [];

    setItinerary({
      ...itinerary,
      days: itinerary.days.map(d => d.dayNumber === newDay.dayNumber ? newDay : d),
      unscheduledOptions: [...ejectedEntries, ...existingUnscheduled],
    });

    setPendingDayData(null);
    setClashModalOpen(false);
  }, [pendingDayData, itinerary, setItinerary]);

  // ── Clash Interceptor: Reject — discard pending data, keep existing timeline ──
  const handleClashReject = useCallback(() => {
    setPendingDayData(null);
    setClashModalOpen(false);
  }, []);

  const [selectedPOI, setSelectedPOI] = useState<{placeId: string, poiId: string} | null>(null);
  const [activeAiNote, setActiveAiNote] = useState<string | undefined>(undefined);

  // ── FIX: Added distance constraint to MouseSensor to allow clicking ──
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 15 } }),
    useSensor(KeyboardSensor)
  );

  const handleDiscoverMore = useCallback(() => {
    const targetId = urlTripId || currentTripId;
    if (targetId) router.push(`/discover/${targetId}`);
  }, [urlTripId, currentTripId, router]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    // Native haptic thud perfectly timed with the dnd-kit 200ms delay
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    const all = itinerary?.days.flatMap(d => d.entries).concat(itinerary?.unscheduledOptions || []) || [];
    setActiveEntry(all.find(en => en.id === e.active.id) || null);
  }, [itinerary]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    
    const { active, over } = event;
    setActiveEntry(null);
    if (!over || !itinerary) return;

    const sourceId = String(active.data.current?.containerId || active.data.current?.sortable?.containerId || '');
    const targetId = String(over.data.current?.containerId || over.data.current?.sortable?.containerId || over.id || '');

    if (!sourceId || !targetId) return;

    let nextDays = [...itinerary.days];
    let nextParkingLot = [...(itinerary.unscheduledOptions || [])];

    const getDayIndex = (id: string) => {
      const num = parseInt(id.replace(/\D/g, ''), 10);
      return nextDays.findIndex(d => d.dayNumber === num);
    };

    const isBookendEntry = (name?: string) => /(accommodation|hotel|airbnb|airport|flight|arrival|departure|start|return)/i.test(name || '');

    if (sourceId === targetId) {
      if (active.id === over.id) return; 

      if (sourceId === 'parking-lot') {
        const oldIndex = nextParkingLot.findIndex(e => e.id === active.id);
        const newIndex = nextParkingLot.findIndex(e => e.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
           nextParkingLot = arrayMove(nextParkingLot, oldIndex, newIndex);
        }
      } else {
        const dIdx = getDayIndex(sourceId);
        if (dIdx === -1) return;
        
        const oldIndex = nextDays[dIdx].entries.findIndex(e => e.id === active.id);
        let newIndex = nextDays[dIdx].entries.findIndex(e => e.id === over.id);
        
        const dayEntries = nextDays[dIdx].entries;
        const hasMorning = dayEntries.length > 0 && isBookendEntry(dayEntries[0].locationName);
        const hasEvening = dayEntries.length > 1 && isBookendEntry(dayEntries[dayEntries.length - 1].locationName);

        if (hasMorning && newIndex === 0) newIndex = 1;
        if (hasEvening && newIndex === dayEntries.length - 1) newIndex = dayEntries.length - 2;

        if (oldIndex !== -1 && newIndex !== -1) {
          const updatedDay = { ...nextDays[dIdx], entries: arrayMove([...nextDays[dIdx].entries], oldIndex, newIndex) };
          nextDays[dIdx] = recalculateDay(updatedDay);
        }
      }
    } 
    else {
      let movedEntry: ItineraryEntry | undefined;

      if (sourceId === 'parking-lot') {
        const idx = nextParkingLot.findIndex(e => e.id === active.id);
        if (idx !== -1) {
          movedEntry = nextParkingLot[idx];
          nextParkingLot = nextParkingLot.filter(e => e.id !== active.id);
        }
      } else {
        const dIdx = getDayIndex(sourceId);
        if (dIdx !== -1) {
          const eIdx = nextDays[dIdx].entries.findIndex(e => e.id === active.id);
          if (eIdx !== -1) {
            movedEntry = nextDays[dIdx].entries[eIdx];
            const updatedDay = { ...nextDays[dIdx], entries: nextDays[dIdx].entries.filter(e => e.id !== active.id) };
            nextDays[dIdx] = recalculateDay(updatedDay); 
          }
        }
      }

      if (!movedEntry) return;
      movedEntry = { ...movedEntry, time: undefined, isFixed: false };

      if (targetId === 'parking-lot') {
        const overIdx = nextParkingLot.findIndex(e => e.id === over.id);
        const insertIdx = overIdx === -1 ? nextParkingLot.length : overIdx;
        nextParkingLot = [...nextParkingLot.slice(0, insertIdx), movedEntry, ...nextParkingLot.slice(insertIdx)];
      } else {
        const dIdx = getDayIndex(targetId);
        if (dIdx !== -1) {
          const dayEntries = nextDays[dIdx].entries;
          const overIdx = dayEntries.findIndex(e => e.id === over.id);
          let insertIdx = overIdx === -1 ? dayEntries.length : overIdx;

          const hasMorning = dayEntries.length > 0 && isBookendEntry(dayEntries[0].locationName);
          const hasEvening = dayEntries.length > 0 && isBookendEntry(dayEntries[dayEntries.length - 1].locationName);

          if (hasMorning && insertIdx === 0) insertIdx = 1;
          if (hasEvening && insertIdx >= dayEntries.length) insertIdx = dayEntries.length - 1;
          if (hasEvening && overIdx === dayEntries.length - 1) insertIdx = dayEntries.length - 1;

          const newEntries = [...dayEntries.slice(0, insertIdx), movedEntry, ...dayEntries.slice(insertIdx)];
          nextDays[dIdx] = recalculateDay({ ...nextDays[dIdx], entries: newEntries });
        }
      }
    }

    setItinerary({ 
      ...itinerary, 
      days: nextDays, 
      unscheduledOptions: nextParkingLot, 
      totalEstimatedCostGBP: nextDays.reduce((s, d) => s + recalcSpend(d.entries), 0) 
    });
  }, [itinerary, setItinerary]);

  const executeDelete = () => {
    if (!itinerary || !deletingTarget) return;
    const { entry, dayNumber } = deletingTarget;
    
    let nextDays = itinerary.days.map(day => {
      if (day.dayNumber === dayNumber) return recalculateDay({ ...day, entries: day.entries.filter(e => e.id !== entry.id) });
      return day;
    });
    const nextParkingLot = (itinerary.unscheduledOptions || []).filter(e => e.id !== entry.id);
    
    setItinerary({ ...itinerary, days: nextDays, unscheduledOptions: nextParkingLot, totalEstimatedCostGBP: nextDays.reduce((s, d) => s + recalcSpend(d.entries), 0) });
    setDeletingTarget(null);
  };

  const handleOpenPlaceModal = (placeId: string, poiId: string, aiNote?: string) => {
    setSelectedPOI({ placeId, poiId });
    setActiveAiNote(aiNote);
  };

  if (!itinerary || !intake) return null;
  const activeDestination = itinerary.essentials?.destination || intake.destination;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pb-20">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="flex-1 flex flex-col gap-10">
              {itinerary.days.map(day => (
                <DayColumn
                  key={day.dayNumber} day={day} anyDragActive={!!activeEntry} accommodationName={intake?.accommodation} destination={activeDestination}
                  onAddActivity={setAddingToDay} onAddRest={setAddingRestToDay} onPlaceClick={handleOpenPlaceModal}
                  onEditTime={setEditingTimeTarget}
                  onDeleteRequest={setDeletingTarget} onToggleFixed={toggleEntryFixed}
                  onEditAccommodation={setEditingAccTarget}
                  onDaySettings={setDaySettingsTarget}
                  onRegenerateDay={handleRegenerateDay}
                  isRegenerating={regeneratingDay === day.dayNumber}
                  activeOverride={localDayOverrides[day.dayNumber]}
                />
              ))}
            </div>
            <div className="w-full lg:w-80 flex-shrink-0">
              <ParkingLot 
                items={itinerary.unscheduledOptions || []} anyDragActive={!!activeEntry} accommodationName={intake?.accommodation} destination={activeDestination}
                onPlaceClick={handleOpenPlaceModal}
                onEditTime={setEditingTimeTarget} onDeleteRequest={setDeletingTarget} 
                onToggleFixed={toggleEntryFixed} onEditAccommodation={setEditingAccTarget}
                onDiscoverMore={handleDiscoverMore}
              />
            </div>
          </div>
        </div>
        
        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeEntry && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-brand-500 bg-white dark:bg-slate-800 shadow-2xl scale-105 opacity-90 ring-4 ring-brand-500/20">
              <div className="flex-1 font-black text-slate-900 dark:text-white text-sm">{activeEntry.locationName}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {selectedPOI && (
          <PlaceDetailsModal 
            placeId={selectedPOI.placeId} 
            poiId={selectedPOI.poiId}
            tripId={urlTripId || currentTripId || ''}
            aiNote={activeAiNote}
            onClose={() => { setSelectedPOI(null); setActiveAiNote(undefined); }} 
          />
        )}
      </AnimatePresence>

      {addingToDay && <AddActivityModal dayNumber={addingToDay} destination={activeDestination} onClose={() => setAddingToDay(null)} />}
      {addingRestToDay && <AddRestModal dayNumber={addingRestToDay} accommodationName={intake?.accommodation} onClose={() => setAddingRestToDay(null)} />}
      
      <AnimatePresence>
        {editingTimeTarget && (
          <TimeEditorModal target={editingTimeTarget} onClose={() => setEditingTimeTarget(null)} onSave={(newTime) => { updateEntryTime(editingTimeTarget.dayNumber, editingTimeTarget.entry.id, newTime); setEditingTimeTarget(null); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editingAccTarget && (
          <EditAccommodationModal 
            target={editingAccTarget} 
            destination={activeDestination} 
            onClose={() => setEditingAccTarget(null)} 
            onSave={(newLocation, newTime, cascade) => { 
              updateAccommodation(editingAccTarget.dayNumber, editingAccTarget.entry.id, newLocation, newTime, cascade); 
              setEditingAccTarget(null); 
            }} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deletingTarget && (
          <DeleteConfirmModal target={deletingTarget} onClose={() => setDeletingTarget(null)} onConfirm={executeDelete} />
        )}
      </AnimatePresence>

      {/* ── Day Override / Settings Modal ── */}
      <AnimatePresence>
        {daySettingsTarget !== null && (
          <DayOverrideModal
            dayNumber={daySettingsTarget}
            existing={localDayOverrides[daySettingsTarget]}
            onClose={() => setDaySettingsTarget(null)}
            onSave={handleSaveDayOverride}
          />
        )}
      </AnimatePresence>

      {/* ── Clash Interceptor Modal ── */}
      <AnimatePresence>
        {clashModalOpen && pendingDayData && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700/80 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20">
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Time Travel Required
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                    Schedule conflict detected
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 flex flex-col gap-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  We had to remove{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {pendingDayData.ejectedItems.map(i => `"${i.title}"`).join(', ')}
                  </span>{' '}
                  to fit your hardcoded schedule.
                </p>

                {/* Warning callout */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                  <span className="text-lg flex-shrink-0 mt-0.5">🎟️</span>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 leading-relaxed">
                    <span className="font-black block mb-0.5">Important:</span>
                    If you have purchased tickets or made reservations for these removed items, please remember to amend or cancel them.
                  </p>
                </div>

                {/* Ejected items list */}
                <div className="flex flex-col gap-2">
                  {pendingDayData.ejectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40"
                    >
                      <span className="text-base flex-shrink-0">📌</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.startTime && item.endTime
                            ? `${item.startTime} – ${item.endTime}`
                            : item.startTime ?? 'Time unset'}
                          {item.location?.name ? ` · ${item.location.name}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <button
                  onClick={handleClashAccept}
                  className="w-full py-3 px-4 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>✅</span> Accept &amp; Move to Staging
                </button>
                <button
                  onClick={handleClashReject}
                  className="w-full py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Reject — Keep Existing Timeline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}