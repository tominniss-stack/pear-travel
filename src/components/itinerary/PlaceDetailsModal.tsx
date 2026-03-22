'use client';

import { useEffect, useState } from 'react';

interface PlaceDetailsModalProps {
  placeId: string;
  aiNote?: string;
  onClose: () => void;
}

export default function PlaceDetailsModal({ placeId, aiNote, onClose }: PlaceDetailsModalProps) {
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ── STRICT GATEKEEPER ──
    // Ensures we only call Google if we have a real, valid ID string
    const isValidId = 
      placeId && 
      placeId !== "" && 
      placeId !== "null" && 
      placeId !== "undefined" && 
      typeof placeId === 'string';

    if (!isValidId) {
      setError("This item isn't linked to a specific Google Maps location.");
      setLoading(false);
      return;
    }

    const fetchPlaceDetails = () => {
      const googleObj = (typeof window !== 'undefined') ? (window as any).google : null;
      if (!googleObj?.maps?.places) {
        setError("Google Maps library not found.");
        setLoading(false);
        return;
      }

      try {
        const dummyDiv = document.createElement('div');
        const service = new googleObj.maps.places.PlacesService(dummyDiv);

        service.getDetails(
          {
            placeId: placeId,
            fields: [
              'name', 'rating', 'user_ratings_total', 'formatted_address', 
              'formatted_phone_number', 'opening_hours', 'website', 
              'photos', 'reviews', 'editorial_summary', 'url'
            ]
          },
          (result: any, status: any) => {
            if (status === googleObj.maps.places.PlacesServiceStatus.OK && result) {
              setPlace(result);
            } else {
              setError("Live details for this location are currently unavailable.");
            }
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Places API error:", err);
        setError("An error occurred while connecting to Google Maps.");
        setLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [placeId]);

  // Handle Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md">✕</button>

        {loading ? (
          <div className="p-12 text-center h-64 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Fetching live data...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center flex flex-col items-center justify-center h-64">
            <span className="text-4xl mb-4">📍</span>
            <p className="text-slate-900 dark:text-white font-bold mb-2">Details Unavailable</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">{error}</p>
            <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-bold">Close</button>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            {/* Image Header */}
            {place.photos && place.photos.length > 0 ? (
              <div className="relative h-64 w-full bg-slate-200">
                <img src={place.photos[0].getUrl({ maxWidth: 800 })} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                <h2 className="absolute bottom-6 left-6 text-3xl font-black text-white">{place.name}</h2>
              </div>
            ) : (
              <div className="p-8 bg-brand-600"><h2 className="text-3xl font-black text-white">{place.name}</h2></div>
            )}

            <div className="p-6 space-y-6">
              {/* ── AI PLANNING NOTE ── */}
              {aiNote && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800/50">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-2">
                    <span>💡</span> AI Planning Note
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">"{aiNote}"</p>
                </div>
              )}

              <div className="flex gap-4">
                {place.rating && <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-lg font-bold text-sm">⭐ {place.rating} ({place.user_ratings_total})</div>}
                {place.opening_hours && <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg font-bold text-sm">{place.opening_hours.isOpen() ? 'Open Now' : 'Closed'}</div>}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Address</p>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{place.formatted_address}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <a href={place.url} target="_blank" rel="noreferrer" className="flex-1 text-center py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Maps</a>
                {place.website && <a href={place.website} target="_blank" rel="noreferrer" className="flex-1 text-center py-3 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors">Website</a>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}