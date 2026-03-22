'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import type { DayItinerary, ItineraryEntry } from '@/types';
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
          <input type="text" value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value); setSelectedPlace(null); }} placeholder={`Search in ${destination}...`} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" autoFocus />
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
          <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Start Time</label><input type="time" value={time} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Est. Cost (£)</label><input type="number" min="0" value={cost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCost(e.target.value)} placeholder="0" className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"><input type="checkbox" checked={isDining} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsDining(e.target.checked)} className="rounded text-brand-600 w-4 h-4" /> Mark as Dining / Restaurant</label>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button>
          <button onClick={handleSave} disabled={!query.trim()} className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl shadow-sm disabled:opacity-50">Add to Trip</button>
        </div>
      </div>
    </div>
  );
}

function TimeEditorModal({ target, onClose, onSave }: { target: NonNullable<ModalTarget>; onClose: () => void; onSave: (time: string) => void }) {
  const [editTime, setEditTime] = useState(target.entry.time ?? '');
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 text-center">Set Time</h3>
        <p className="text-xs text-slate-500 text-center mb-6 px-4 line-clamp-2">{target.entry.locationName}</p>
        <div className="flex justify-center mb-8">
          <input type="time" value={editTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTime(e.target.value)} className="text-4xl font-black text-center bg-slate-50 dark:bg-slate-900 text-brand-600 dark:text-brand-400 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 outline-none w-full max-w-[200px]" autoFocus />
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

function EditAccommodationModal({ 
  target, destination, onClose, onSave 
}: { 
  target: NonNullable<ModalTarget>; destination: string; onClose: () => void; 
  onSave: (location: string, time: string, cascade: boolean) => void 
}) {
  const [query, setQuery] = useState(target.entry.locationName);
  const [time, setTime] = useState(target.entry.time || '');
  const [cascade, setCascade] = useState(true);
  const [predictions, setPredictions] = useState<any[]>([]);
  const autocompleteService = useRef<any>(null);

  useEffect(() => {
    const googleObj = (typeof window !== 'undefined') ? (window as any).google : null;
    if (googleObj?.maps?.places) {
      autocompleteService.current = new googleObj.maps.places.AutocompleteService();
    }
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
          <input 
            type="text" value={query} onChange={(e) => setQuery(e.target.value)} 
            placeholder={`Search in ${destination}...`} 
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" 
          />
          {predictions.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
              {predictions.map((pred) => (
                <button 
                  key={pred.place_id} 
                  onClick={() => { setQuery(pred.structured_formatting?.main_text || pred.description); setPredictions([]); }} 
                  className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors"
                >
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{pred.structured_formatting?.main_text || pred.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Start / Return Time</label>
          <input 
            type="time" value={time} onChange={(e) => setTime(e.target.value)} 
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white" 
          />
        </div>

        <div className="bg-brand-50 dark:bg-brand-900/10 p-4 rounded-xl border border-brand-200 dark:border-brand-800/50 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="pt-0.5">
              <input 
                type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} 
                className="rounded text-brand-600 w-4 h-4 cursor-pointer" 
              />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-900 dark:text-brand-300">Apply to all following days</span>
              <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Updates future morning/evening bookends to this location. (Ignores your final departure flight).
              </span>
            </div>
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

// ── Item Component (Zoned Interactions) ─────────────────────────────────────

function SortableTimelineEntry({ 
  entry, containerId, isDraggingGlobal, dayNumber, isParkingLot, accommodationName, onPlaceClick, onEditTime, onDeleteRequest, onToggleFixed, onEditAccommodation 
}: { 
  entry: ItineraryEntry; containerId: UniqueIdentifier; isDraggingGlobal: boolean; dayNumber: number; isParkingLot: boolean; accommodationName?: string;
  onPlaceClick: (id: string, aiNote?: string) => void; onEditTime: (target: NonNullable<ModalTarget>) => void; onDeleteRequest: (target: NonNullable<ModalTarget>) => void;
  onToggleFixed: (dayNumber: number, entryId: string) => void; onEditAccommodation: (target: NonNullable<ModalTarget>) => void;
}) {

  const isBookend = entry.isAccommodation || entry.transitMethod === 'Start of Day' || /(accommodation|hotel|airbnb|start of day|return to)/i.test(entry.activityDescription || '') || /(accommodation|hotel|airbnb|start of day|return to)/i.test(entry.locationName || '');
  const isFlight = /(airport|flight|departure)/i.test(entry.activityDescription || '') || /(airport|flight|departure)/i.test(entry.locationName || '');
  const isStay = isBookend && !isFlight;

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
  }, []);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ 
    id: entry.id, 
    data: { type: 'entry', containerId },
    disabled: isBookend || entry.isFixed 
  });
  
  const dndStyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };

  // ── PARSE ANNOTATIONS ──
  const rawDesc = entry.activityDescription || '';
  const annotationMatch = rawDesc.match(/^\[(.*?)\]/);
  const annotation = annotationMatch ? annotationMatch[1] : null;

  // ── DYNAMIC NAME/ADDRESS SWAPPER (RELAXED) ──
  let displayTitle = entry.locationName || 'Unknown Location';
  let displayDesc = rawDesc.replace(/^\[.*?\]\s*/, '');

  if (isStay) {
    // Only overwrite the title with the global name if the current title is completely generic
    const isGeneric = /^(accommodation|hotel|airbnb|start of day|return to)/i.test(displayTitle.trim());
    if (isGeneric && accommodationName) {
      displayTitle = accommodationName;
    }
  }

  return (
    <div ref={setNodeRef} style={dndStyle} className="relative mb-3 group/entry">
      
      {!isBookend && !entry.isFixed && (
        <div className="absolute inset-0 rounded-2xl bg-red-500 flex items-center justify-end px-6 z-0">
          <button onClick={() => onDeleteRequest({ entry, dayNumber })} className="flex flex-col items-center gap-1 text-white font-black uppercase text-[10px]">
            <span className="text-xl">🗑️</span> Trash
          </button>
        </div>
      )}

      {!isBookend && !entry.isFixed && !isTouch && (
        <button 
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteRequest({ entry, dayNumber }); }}
          className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-white dark:bg-slate-700 text-slate-400 hover:text-white hover:bg-red-500 hover:border-red-600 shadow-md border border-slate-200 dark:border-slate-600 flex items-center justify-center opacity-0 group-hover/entry:opacity-100 transition-all z-20 cursor-pointer"
          title="Delete Activity"
        >
          ✕
        </button>
      )}

      <motion.div
        drag={(!isBookend && !entry.isFixed && isTouch) ? "x" : false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.05}
        dragDirectionLock
        className={`relative z-10 flex items-stretch rounded-2xl border shadow-sm transition-all ${
          isDragging ? 'opacity-50 scale-[0.98] ring-2 ring-brand-500 cursor-grabbing' : ''
        } ${
          entry.isFixed ? 'border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        } ${!isTouch && !entry.isFixed && !isBookend ? 'hover:border-slate-300 dark:hover:border-slate-600' : ''}`}
        style={{ touchAction: 'pan-y' }}
      >
        
        {/* ── ONLY SHOW TIME/PIN IF IT IS NOT IN THE PARKING LOT ── */}
        {!isParkingLot && (
          <div className="flex flex-col items-center justify-center w-20 py-3 flex-shrink-0 border-r border-slate-100 dark:border-slate-700/50 relative">
            {entry.timeWarning && (
              <div 
                className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border border-red-200 dark:border-red-800/50 z-20"
                title={entry.timeWarning}
              >
                ⚠️ {entry.timeWarning.includes('Closes') ? 'CLOSES SOON' : 'NOT OPEN'}
              </div>
            )}

            <button 
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); if (!isBookend) onEditTime({ entry, dayNumber }); }}
              className={`text-sm tabular-nums font-bold transition-colors cursor-pointer mt-1 ${entry.isFixed ? 'text-brand-600 dark:text-brand-400' : isBookend ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400 hover:text-brand-600'}`}
            >
              {entry.time || '--:--'}
            </button>
            
            <div className="mt-1">
              {!isBookend ? (
                 <button 
                   onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onToggleFixed(dayNumber, entry.id); }}
                   className={`text-xs p-1 rounded transition-all cursor-pointer hover:scale-110 ${entry.isFixed ? 'opacity-100 drop-shadow-sm text-brand-600' : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0 text-slate-500'}`}
                   title={entry.isFixed ? "Unlock activity to enable dragging and AI recalculation" : "Pin activity to lock it in place"}
                 >
                   {entry.isFixed ? '📌' : '📍'}
                 </button>
              ) : (
                 <span className="text-[10px] opacity-40 cursor-not-allowed text-slate-500" title="Anchored Travel Element">🔒</span>
              )}
            </div>
          </div>
        )}

        <div 
          ref={isTouch ? setActivatorNodeRef : undefined}
          {...(isTouch && !isBookend && !entry.isFixed ? { ...attributes, ...listeners } : {})}
          className={`flex-1 min-w-0 p-4 ${isParkingLot ? 'pl-5' : 'pr-2'} ${isTouch && !isBookend && !entry.isFixed ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          {/* ── SLEEK AI NOTE OVERLINE ── */}
          {isParkingLot && annotation && (
            <div className="mb-1.5 flex items-center">
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50 shadow-sm">
                ✨ AI Note
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-3 mb-1">
            <h4 
              onClick={() => { if (entry.placeId) onPlaceClick(entry.placeId, annotation || undefined); }}
              className={`text-sm font-bold line-clamp-2 leading-tight ${entry.placeId ? 'text-brand-600 dark:text-brand-400 hover:underline cursor-pointer' : 'text-slate-900 dark:text-white'}`}
            >
              {displayTitle}
            </h4>
            {!/(Accommodation|Hotel|Airbnb|Start|Return)/i.test(entry.locationName ?? '') && entry.estimatedCostGBP > 0 && (
              <span className="flex-shrink-0 text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600">{formatCost(entry.estimatedCostGBP)}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{displayDesc}</p>
        </div>

        {/* ── ZONE 3: DRAG HANDLE OR EDIT BOOKEND BUTTON ── */}
        {!isTouch && !isBookend && !entry.isFixed && (
          <div 
            ref={!isTouch ? setActivatorNodeRef : undefined}
            {...attributes} {...listeners} 
            className="w-10 flex items-center justify-center text-slate-300 hover:text-brand-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-r-2xl cursor-grab active:cursor-grabbing transition-colors touch-none border-l border-slate-100 dark:border-slate-700/50"
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" className="opacity-60">
              <circle cx="3" cy="2" r="1.5" /><circle cx="3" cy="8" r="1.5" /><circle cx="3" cy="14" r="1.5" />
              <circle cx="9" cy="2" r="1.5" /><circle cx="9" cy="8" r="1.5" /><circle cx="9" cy="14" r="1.5" />
            </svg>
          </div>
        )}
        
        {isBookend && (
          <div 
            onClick={(e) => { e.stopPropagation(); onEditAccommodation({ entry, dayNumber }); }}
            className="w-10 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-r-2xl cursor-pointer transition-colors border-l border-slate-100 dark:border-slate-700/50"
            title="Edit Accommodation & Time"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </div>
        )}

        {!isBookend && entry.isFixed && !isTouch && (
          <div className="w-10 flex-shrink-0 border-l border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 rounded-r-2xl" />
        )}

      </motion.div>
    </div>
  );
}

// ── Drop Zone Components ───────────────────────────────────────────────────

function DayColumn({ 
  day, anyDragActive, accommodationName, onAddActivity, onAddRest, onPlaceClick, onEditTime, onDeleteRequest, onToggleFixed, onEditAccommodation 
}: { 
  day: DayItinerary; anyDragActive: boolean; accommodationName?: string;
  onAddActivity: (n: number) => void; onAddRest: (n: number) => void; onPlaceClick: (id: string, note?: string) => void;
  onEditTime: (t: NonNullable<ModalTarget>) => void; onDeleteRequest: (t: NonNullable<ModalTarget>) => void;
  onToggleFixed: (dayNumber: number, entryId: string) => void; onEditAccommodation: (t: NonNullable<ModalTarget>) => void;
}) {
  const containerId = getDayContainerId(day.dayNumber);
  const { setNodeRef, isOver } = useDroppable({ id: containerId });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-sm shadow-md">{day.dayNumber}</div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Day {day.dayNumber}</h3>
      </div>
      <div ref={setNodeRef} className={`p-4 rounded-3xl border-2 transition-all min-h-[100px] ${anyDragActive ? 'border-brand-300 dark:border-brand-600 bg-brand-50/20 border-dashed' : 'border-transparent bg-slate-50/50 dark:bg-slate-800/30'} ${isOver ? 'ring-4 ring-brand-200' : ''}`}>
        <SortableContext id={containerId as string} items={day.entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {day.entries.map((entry) => (
            <SortableTimelineEntry key={entry.id} entry={entry} dayNumber={day.dayNumber} containerId={containerId} accommodationName={accommodationName} isDraggingGlobal={anyDragActive} isParkingLot={false} onPlaceClick={onPlaceClick} onEditTime={onEditTime} onDeleteRequest={onDeleteRequest} onToggleFixed={onToggleFixed} onEditAccommodation={onEditAccommodation} />
          ))}
          {/* ── NEW: Side-by-Side Injection Buttons ── */}
          <div className="flex gap-3 mt-4">
            <button 
              onClick={() => onAddActivity(day.dayNumber)} 
              className="flex-1 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black uppercase text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all bg-white dark:bg-slate-800"
            >
              + Add Activity
            </button>
            <button 
              onClick={() => onAddRest(day.dayNumber)} 
              className="flex-1 py-3 border-2 border-dashed border-brand-200 dark:border-brand-800/50 rounded-xl text-xs font-black uppercase text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all bg-white dark:bg-slate-800"
            >
              🛏️ Add Rest Stop
            </button>
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function ParkingLot({ 
  items, anyDragActive, accommodationName, onPlaceClick, onEditTime, onDeleteRequest, onToggleFixed, onEditAccommodation, onDiscoverMore
}: { 
  items: ItineraryEntry[]; anyDragActive: boolean; accommodationName?: string; onPlaceClick: (id: string, note?: string) => void; onEditTime: (t: NonNullable<ModalTarget>) => void; 
  onDeleteRequest: (t: NonNullable<ModalTarget>) => void; onToggleFixed: (dayNumber: number, entryId: string) => void;
  onEditAccommodation: (t: NonNullable<ModalTarget>) => void; onDiscoverMore: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'parking-lot' });
  return (
    <div className="sticky top-24 flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">The Parking Lot</h3>
        <button 
          onClick={onDiscoverMore}
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-900/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm"
        >
          <span>+</span> Discover More
        </button>
      </div>
      <div ref={setNodeRef} className={`p-4 rounded-3xl border-2 min-h-[250px] transition-all ${anyDragActive ? 'border-brand-300 bg-brand-50/20 border-dashed' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-xl'} ${isOver ? 'ring-4 ring-brand-200' : ''}`}>
        <SortableContext id="parking-lot" items={items.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <div className="py-20 text-center px-6"><p className="text-xs text-slate-400 font-medium">Drag unpinned activities here to un-schedule them.</p></div>
          ) : (
            items.map((entry) => (
              <SortableTimelineEntry key={entry.id} entry={entry} dayNumber={-1} containerId="parking-lot" accommodationName={accommodationName} isDraggingGlobal={anyDragActive} isParkingLot={true} onPlaceClick={onPlaceClick} onEditTime={onEditTime} onDeleteRequest={onDeleteRequest} onToggleFixed={onToggleFixed} onEditAccommodation={onEditAccommodation} />
            ))
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
  const addCustomEntry = useTripStore((state) => state.addCustomEntry);
  
  const [activeEntry, setActiveEntry] = useState<ItineraryEntry | null>(null);
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [editingTimeTarget, setEditingTimeTarget] = useState<ModalTarget>(null);
  const [editingAccTarget, setEditingAccTarget] = useState<ModalTarget>(null);
  const [deletingTarget, setDeletingTarget] = useState<ModalTarget>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeAiNote, setActiveAiNote] = useState<string | undefined>(undefined);

  const sensors = useSensors(
    useSensor(MouseSensor), 
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 15 } }),
    useSensor(KeyboardSensor)
  );

  // ── Navigate back to Discover ──
  const handleDiscoverMore = useCallback(() => {
    const targetId = urlTripId || currentTripId;
    if (targetId) {
      router.push(`/discover/${targetId}`);
    }
  }, [urlTripId, currentTripId, router]);

  // ── Inject Unpinned Rest Stop ──
  const handleAddRestStop = (dayNumber: number) => {
    addCustomEntry(dayNumber, {
      locationName: intake?.accommodation || 'Accommodation',
      activityDescription: 'Mid-day rest and refresh before heading back out.',
      transitMethod: 'Walking', 
      estimatedCostGBP: 0,
      isDining: false,
    });
  };

  const handleDragStart = useCallback((e: DragStartEvent) => {
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

  const handleOpenPlaceModal = (placeId: string, aiNote?: string) => {
    setSelectedPlaceId(placeId);
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
                  key={day.dayNumber} day={day} anyDragActive={!!activeEntry} accommodationName={intake?.accommodation}
                  onAddActivity={setAddingToDay} onAddRest={handleAddRestStop} onPlaceClick={handleOpenPlaceModal}
                  onEditTime={setEditingTimeTarget} 
                  onDeleteRequest={setDeletingTarget} onToggleFixed={toggleEntryFixed} 
                  onEditAccommodation={setEditingAccTarget}
                />
              ))}
            </div>
            <div className="w-full lg:w-80 flex-shrink-0">
              <ParkingLot 
                items={itinerary.unscheduledOptions || []} anyDragActive={!!activeEntry} accommodationName={intake?.accommodation}
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
        {selectedPlaceId && (
          <PlaceDetailsModal 
            placeId={selectedPlaceId} 
            aiNote={activeAiNote}
            onClose={() => { setSelectedPlaceId(null); setActiveAiNote(undefined); }} 
          />
        )}
      </AnimatePresence>

      {addingToDay && <AddActivityModal dayNumber={addingToDay} destination={activeDestination} onClose={() => setAddingToDay(null)} />}
      
      <AnimatePresence>
        {editingTimeTarget && (
          <TimeEditorModal 
            target={editingTimeTarget} 
            onClose={() => setEditingTimeTarget(null)} 
            onSave={(newTime) => {
              updateEntryTime(editingTimeTarget.dayNumber, editingTimeTarget.entry.id, newTime);
              setEditingTimeTarget(null);
            }} 
          />
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
    </>
  );
}