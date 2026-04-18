'use client';

import { useEffect, useState, useCallback } from 'react';
import { Paperclip, UploadCloud, Loader2, FileText, FileImage, CheckCircle2 } from 'lucide-react';
import { useTripStore } from '@/store/tripStore';

export interface DocumentInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  poiId?: string | null;
}

interface StoredOpeningHours {
  weekdayDescriptions?: string[];
}

interface PlaceDetailsModalProps {
  placeId: string;
  poiId: string;
  tripId: string;
  aiNote?: string;
  openingHours?: StoredOpeningHours;
  tripDocuments?: DocumentInfo[];
  onClose: () => void;
  onDocumentUpdate?: () => void;
}

export default function PlaceDetailsModal({
  placeId,
  poiId,
  tripId,
  aiNote,
  openingHours,
  tripDocuments = [],
  onClose,
  onDocumentUpdate
}: PlaceDetailsModalProps) {
  
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Document State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocToLink, setSelectedDocToLink] = useState('');

  // ── Offline POI data from Zustand (fallback when live Places API fails) ──
  const selectedPOIs = useTripStore(state => state.selectedPOIs);
  const offlinePoi = selectedPOIs.find(p => p.id === poiId);

  // ── V3 Booking Loop State ──
  const itinerary = useTripStore(state => state.itinerary);
  const currentTrip = useTripStore(state => state.savedTrips.find(t => t.id === state.currentTripId) ?? null);

  // ── Self-Healing: derive a text query from the itinerary entry so we can
  //    recover a fresh place_id when Gemini emits an expired/hallucinated one ──
  const entry = itinerary?.days.flatMap(d => d.entries).find(e => e.placeId === poiId);
  const searchQuery = entry ? `${entry.locationName} ${currentTrip?.destination || ''}`.trim() : null;
  const setLockedAccommodation = useTripStore(state => state.setLockedAccommodation);
  const [showBooking, setShowBooking] = useState(false);
  const [checkInDay, setCheckInDay] = useState(1);
  const [checkOutDay, setCheckOutDay] = useState(itinerary?.days.length ? itinerary.days.length + 1 : 2);

  const attachedDocs = tripDocuments.filter(doc => doc.poiId === poiId);
  const availableDocsToLink = tripDocuments.filter(doc => !doc.poiId);

  useEffect(() => {
    const isValidId = placeId && placeId !== "" && placeId !== "null" && typeof placeId === 'string';

    if (!isValidId) {
      // No valid placeId — skip live fetch, show offline data only
      setLoading(false);
      return;
    }

    let cancelled = false;
    // Poll for window.google.maps.places — the SDK loads asynchronously and
    // may not be ready when the modal first mounts (race condition).
    const MAX_WAIT_MS = 8000;
    const POLL_INTERVAL_MS = 150;
    let elapsed = 0;

    const attemptFetch = () => {
      if (cancelled) return;

      const googleObj = (typeof window !== 'undefined') ? (window as any).google : null;

      if (!googleObj?.maps?.places) {
        elapsed += POLL_INTERVAL_MS;
        if (elapsed >= MAX_WAIT_MS) {
          // SDK never loaded — quietly fall back to offline data
          if (!cancelled) setLoading(false);
          return;
        }
        setTimeout(attemptFetch, POLL_INTERVAL_MS);
        return;
      }

      // Library is ready — fetch place details
      try {
        const dummyDiv = document.createElement('div');
        const service = new googleObj.maps.places.PlacesService(dummyDiv);

        service.getDetails(
          {
            placeId: placeId,
            fields: [
              'name', 'rating', 'user_ratings_total', 'formatted_address',
              'formatted_phone_number', 'opening_hours', 'website',
              'photos', 'reviews', 'editorial_summary', 'url', 'types'
            ]
          },
          (result: any, status: any) => {
            if (cancelled) return;

            if (status === googleObj.maps.places.PlacesServiceStatus.OK && result) {
              // ── Happy path ──────────────────────────────────────────────────
              setPlace(result);
              setLoading(false);
            } else {
              // ── Self-Healing Place ID fallback ──────────────────────────────
              // The placeId from Gemini may be expired or hallucinated.
              // If we have a text query, attempt findPlaceFromQuery to recover
              // a fresh place_id, then retry getDetails once with that new id.
              console.warn('[PlaceDetailsModal] getDetails non-OK status:', status, '— attempting self-heal via findPlaceFromQuery');

              if (!searchQuery) {
                // No query available — soft offline fallback
                setLoading(false);
                return;
              }

              try {
                service.findPlaceFromQuery(
                  { query: searchQuery, fields: ['place_id'] },
                  (searchResults: any[], searchStatus: any) => {
                    if (cancelled) return;

                    const healedPlaceId = searchResults?.[0]?.place_id;

                    if (
                      searchStatus !== googleObj.maps.places.PlacesServiceStatus.OK ||
                      !healedPlaceId
                    ) {
                      console.warn('[PlaceDetailsModal] findPlaceFromQuery failed:', searchStatus);
                      setLoading(false);
                      return;
                    }

                    console.info('[PlaceDetailsModal] Self-healed place_id:', healedPlaceId);

                    // Second attempt with the recovered place_id
                    service.getDetails(
                      {
                        placeId: healedPlaceId,
                        fields: [
                          'name', 'rating', 'user_ratings_total', 'formatted_address',
                          'formatted_phone_number', 'opening_hours', 'website',
                          'photos', 'reviews', 'editorial_summary', 'url', 'types'
                        ]
                      },
                      (healedResult: any, healedStatus: any) => {
                        if (cancelled) return;
                        if (healedStatus === googleObj.maps.places.PlacesServiceStatus.OK && healedResult) {
                          setPlace(healedResult);
                        } else {
                          console.warn('[PlaceDetailsModal] Retry getDetails also failed:', healedStatus);
                        }
                        setLoading(false);
                      }
                    );
                  }
                );
              } catch (healErr) {
                if (!cancelled) {
                  console.error('[PlaceDetailsModal] findPlaceFromQuery threw:', healErr);
                  setLoading(false);
                }
              }
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          console.error("Places API error:", err);
          setLoading(false);
        }
      }
    };

    attemptFetch();

    return () => { cancelled = true; };
  }, [placeId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const processUpload = async (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or Image file.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tripId', tripId); 
      formData.append('poiId', poiId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      if (onDocumentUpdate) onDocumentUpdate();
      
    } catch (err) {
      console.error(err);
      alert('Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLinkExistingDoc = async () => {
    if (!selectedDocToLink) return;
    try {
      setSelectedDocToLink('');
      if (onDocumentUpdate) onDocumentUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to link document.');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) await processUpload(e.dataTransfer.files[0]);
  }, [tripId, poiId]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-5 h-5 text-blue-500" />;
    return <Paperclip className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-colors">✕</button>

        {loading ? (
          <div className="p-12 text-center h-64 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Fetching live data...</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {place?.photos && place.photos.length > 0 ? (
              <div className="relative h-48 sm:h-64 w-full bg-slate-200 dark:bg-slate-800 shrink-0">
                <img src={place.photos[0].getUrl({ maxWidth: 800 })} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                <h2 className="absolute bottom-6 left-6 right-6 text-2xl sm:text-3xl font-black text-white leading-tight">{place.name}</h2>
              </div>
            ) : (
              <div className="p-8 bg-brand-600 shrink-0"><h2 className="text-3xl font-black text-white">{place?.name || offlinePoi?.name || 'Activity Details'}</h2></div>
            )}

            <div className="p-6 space-y-8">
              {aiNote && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800/50">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-2"><span>💡</span> AI Planning Note</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">"{aiNote}"</p>
                </div>
              )}

              {/* Maps Details */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {place?.rating && <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg font-bold text-sm border border-amber-100 dark:border-amber-800/50">⭐ {place.rating} ({place.user_ratings_total})</div>}
                  {place?.opening_hours && <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg font-bold text-sm border border-emerald-100 dark:border-emerald-800/50">{place.opening_hours.isOpen() ? 'Open Now' : 'Closed'}</div>}
                </div>
                
                {place?.formatted_address && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Address</p>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{place.formatted_address}</p>
                  </div>
                )}

                {(() => {
                  // Priority: live Places API weekday_text → prop openingHours → offlinePoi from store
                  const hoursLines: string[] =
                    (place?.opening_hours?.weekday_text?.length > 0)
                      ? place.opening_hours.weekday_text
                      : (openingHours?.weekdayDescriptions?.length ?? 0) > 0
                        ? openingHours!.weekdayDescriptions!
                        : (offlinePoi?.openingHours?.weekdayDescriptions ?? []);

                  if (hoursLines.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        🕒 Opening Hours
                      </p>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        {hoursLines.map((line: string, i: number) => {
                          const [day, ...rest] = line.split(': ');
                          const hours = rest.join(': ');
                          return (
                            <div
                              key={i}
                              className={`flex items-baseline justify-between gap-3 px-3 py-2 text-xs ${
                                i < hoursLines.length - 1
                                  ? 'border-b border-slate-100 dark:border-slate-700/40'
                                  : ''
                              }`}
                            >
                              <span className="font-bold text-slate-600 dark:text-slate-300 w-24 flex-shrink-0">{day}</span>
                              <span className="text-slate-500 dark:text-slate-400 text-right">{hours}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-3 pt-2">
                  {place?.url && <a href={place.url} target="_blank" rel="noreferrer" className="flex-1 text-center py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Open in Maps</a>}
                  {place?.website && <a href={place.website} target="_blank" rel="noreferrer" className="flex-1 text-center py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors">Visit Website</a>}
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* ── ACCOMMODATION BOOKING LOOP ── */}
              <div className="bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-200 dark:border-brand-800/50 p-4">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowBooking(!showBooking)}>
                  <h3 className="text-sm font-bold text-brand-900 dark:text-brand-100 flex items-center gap-2">
                    🛏️ Set as Trip Accommodation
                  </h3>
                  <span className="text-brand-600 font-bold">{showBooking ? '▲' : '▼'}</span>
                </div>
                
                {showBooking && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-brand-200 dark:border-brand-800/50">
                    <p className="text-xs text-brand-700 dark:text-brand-300 leading-relaxed">
                      Lock in this location. The timeline will automatically cascade this as your starting and ending point for the selected days.
                    </p>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-brand-800 dark:text-brand-200 mb-1">Check-in Day</label>
                        <select 
                          value={checkInDay} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setCheckInDay(val);
                            if (checkOutDay < val) setCheckOutDay(val);
                          }} 
                          className="w-full bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white"
                        >
                          {itinerary?.days.map(d => <option key={`in-${d.dayNumber}`} value={d.dayNumber}>Day {d.dayNumber}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-brand-800 dark:text-brand-200 mb-1">Check-out Day</label>
                        <select 
                          value={checkOutDay} 
                          onChange={e => setCheckOutDay(Number(e.target.value))} 
                          className="w-full bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white"
                        >
                           {Array.from({length: (itinerary?.days.length || 0) + 1}, (_, i) => i + 1).filter(d => d >= checkInDay).map(d => (
                             <option key={`out-${d}`} value={d}>Day {d}</option>
                           ))}
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setLockedAccommodation({
                          placeId,
                          locationName: place?.name || 'Unknown Location',
                          checkInDay,
                          checkOutDay
                        });
                        setShowBooking(false);
                        if (onDocumentUpdate) onDocumentUpdate();
                      }}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                    >
                      Confirm Accommodation
                    </button>
                  </div>
                )}
              </div>

              {/* ── TICKETS & DOCUMENTS SECTION ── */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  Tickets & Documents
                </h3>

                {attachedDocs.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {attachedDocs.map(doc => (
                      <a 
                        key={doc.id}
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mr-3">
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {doc.fileName}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  {availableDocsToLink.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Attach an existing trip file:</label>
                      <div className="flex gap-2">
                        <select 
                          value={selectedDocToLink}
                          onChange={(e) => setSelectedDocToLink(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Select a document...</option>
                          {availableDocsToLink.map(doc => (
                            <option key={doc.id} value={doc.id}>{doc.fileName}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleLinkExistingDoc}
                          disabled={!selectedDocToLink}
                          className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold disabled:opacity-50 transition-opacity"
                        >
                          Attach
                        </button>
                      </div>
                    </div>
                  )}

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${
                      isDragging 
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                        : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => e.target.files?.[0] && processUpload(e.target.files[0])}
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      disabled={isUploading}
                    />
                    
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-brand-500 animate-spin mb-2" />
                    ) : (
                      <UploadCloud className={`w-6 h-6 mb-2 ${isDragging ? 'text-brand-500' : 'text-slate-400'}`} />
                    )}
                    
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {isUploading ? 'Uploading & Linking...' : 'Upload a new ticket or document'}
                    </p>
                    {!isUploading && <p className="text-xs text-slate-500 mt-1">PDF or Image (Max 10MB)</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}