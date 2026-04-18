'use client';

import { useEffect, useRef, useState } from 'react';
import type { ItineraryEntry } from '@/types';

// In-memory cache to prevent redundant API calls when toggling views.
const geocodeCache: Record<string, any> = {};

interface DayMapProps {
  entries: ItineraryEntry[];
  destination: string;
  onMarkerClick: (placeId: string, poiId: string) => void;
}

export default function DayMap({ entries, destination, onMarkerClick }: DayMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any | null>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Initialise the Map — poll for window.google.maps to handle async script loading
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let cancelled = false;
    const MAX_WAIT_MS = 8000;
    const POLL_INTERVAL_MS = 150;
    let elapsed = 0;

    const tryInit = () => {
      if (cancelled || !mapRef.current) return;

      const googleObj = (window as any).google;
      if (!googleObj?.maps?.Map) {
        elapsed += POLL_INTERVAL_MS;
        if (elapsed < MAX_WAIT_MS) {
          setTimeout(tryInit, POLL_INTERVAL_MS);
        }
        // If MAX_WAIT_MS exceeded, give up silently — map stays blank
        return;
      }

      const newMap = new googleObj.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 0, lng: 0 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
        ]
      });

      if (!cancelled) setMap(newMap);
    };

    tryInit();

    return () => { cancelled = true; };
  }, []);

  // 2. Resolve Coordinates & Draw Markers
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google) return;

    const googleObj = (window as any).google;
    const geocoder = new googleObj.maps.Geocoder();
    const bounds = new googleObj.maps.LatLngBounds();

    // Clean up existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Filter valid places (excluding generic breaks and flights)
    const validStops = entries.filter(e => {
      const isFlight = /(flight|airport|departure|arrival)/i.test(e.locationName + ' ' + (e.activityDescription || ''));
      const isManualRest = e.locationName === 'Room Break' || e.locationName === 'Local Coffee / Cafe Break';
      const isGenericAccommodation = /^(accommodation|hotel|airbnb|start of day)$/i.test((e.locationName || '').trim());
      
      return !isFlight && !isManualRest && !isGenericAccommodation;
    });

    if (validStops.length === 0) return;

    const brandColour = '#10b981'; // Tailwind emerald-500

    // Geocoder with built-in retry logic
    const geocodeWithRetry = async (request: any, retries = 3): Promise<any> => {
      return new Promise((resolve, reject) => {
        geocoder.geocode(request, (results: any, status: any) => {
          if (status === googleObj.maps.GeocoderStatus.OK && results && results[0]) {
            resolve(results[0].geometry.location.toJSON());
          } else if (status === googleObj.maps.GeocoderStatus.OVER_QUERY_LIMIT && retries > 0) {
            setTimeout(() => {
              geocodeWithRetry(request, retries - 1).then(resolve).catch(reject);
            }, 500);
          } else {
            reject(status);
          }
        });
      });
    };

    const processMarkers = async () => {
      // 1. Collect all resolved coordinates first
      const resolvedStops: Array<{ stop: ItineraryEntry, index: number, pos: any, cacheKey: string }> = [];

      for (let index = 0; index < validStops.length; index++) {
        const stop = validStops[index];
        const hasValidPlaceId = stop.placeId && stop.placeId !== "null" && stop.placeId !== "";
        const geocodeRequest = hasValidPlaceId 
          ? { placeId: stop.placeId } 
          : { address: `${stop.locationName}, ${destination}` };
          
        const cacheKey = hasValidPlaceId ? stop.placeId! : `${stop.locationName}-${destination}`;

        if (geocodeCache[cacheKey]) {
          resolvedStops.push({ stop, index, pos: geocodeCache[cacheKey], cacheKey });
        } else {
          try {
            const pos = await geocodeWithRetry(geocodeRequest);
            geocodeCache[cacheKey] = pos;
            resolvedStops.push({ stop, index, pos, cacheKey });
          } catch (err) {
            console.warn(`Pear Travel: Geocode failed for ${stop.locationName}`, err);
          }
          await new Promise(resolve => setTimeout(resolve, 250)); // Rate limit buffer
        }
      }

      // 2. Group stops that share the exact same location
      const groupedMarkers = new Map<string, { pos: any, indices: number[], stop: ItineraryEntry }>();

      resolvedStops.forEach(({ stop, index, pos, cacheKey }) => {
        if (groupedMarkers.has(cacheKey)) {
          groupedMarkers.get(cacheKey)!.indices.push(index + 1);
        } else {
          groupedMarkers.set(cacheKey, { pos, indices: [index + 1], stop });
        }
      });

      // 3. Draw the grouped markers
      groupedMarkers.forEach(({ pos, indices, stop }) => {
        bounds.extend(pos);
        
        const labelText = indices.join(', ');
        // Dynamically shrink text if it's a multi-stop pin like "1, 4"
        const fontSize = labelText.length > 2 ? '11px' : '14px';

        const hasValidPlaceId = stop.placeId && stop.placeId !== "null" && stop.placeId !== "";

        const marker = new googleObj.maps.Marker({
          position: pos,
          map,
          title: stop.locationName,
          label: { text: labelText, color: 'white', fontSize: fontSize, fontWeight: 'bold' },
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
            fillColor: brandColour,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            scale: 1.8,
            labelOrigin: new googleObj.maps.Point(12, 10)
          }
        });

        if (hasValidPlaceId) {
          marker.addListener('click', () => {
            onMarkerClick(stop.placeId as string, stop.id);
          });
        }

        markersRef.current.push(marker);
      });

      // 4. Fit the map to bounds
      if (markersRef.current.length > 0) {
        map.fitBounds(bounds);
        const listener = googleObj.maps.event.addListener(map, "idle", () => { 
          if (map.getZoom() && map.getZoom() > 15) map.setZoom(15); 
          googleObj.maps.event.removeListener(listener); 
        });
      }
    };

    processMarkers();

  }, [map, entries, destination, onMarkerClick]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[500px] md:min-h-[600px] bg-slate-100 dark:bg-slate-800" 
    />
  );
}