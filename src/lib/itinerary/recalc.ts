import type { DayItinerary, ItineraryEntry } from '@/types';

// ── Helpers ──

// Converts "09:30" to 570 (minutes from midnight)
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
}

// Converts 570 to "09:30"
function minutesToTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60) % 24; // Wrap around at midnight
  const mins = Math.floor(minutes % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Extracts "15" from "15 min walk"
function parseTransitMinutes(note?: string): number {
  if (!note) return 0;
  const match = note.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : 0;
}

// ── The Tetris Engine ──

export function recalculateDay(day: DayItinerary): DayItinerary {
  if (!day.entries || day.entries.length === 0) return day;

  let currentMinutes = 9 * 60; // Default start at 09:00

  const recalculatedEntries = day.entries.map((entry, index) => {
    
    // 1. THE MORNING BOOKEND: Always anchor the start of the day
    const isBookend = /(Accommodation|Hotel|Airbnb|Start of Day)/i.test(entry.locationName || '');
    if (index === 0 && isBookend) {
      // If it already has a time, use it. Otherwise, force 09:00.
      currentMinutes = entry.time ? timeToMinutes(entry.time) : 9 * 60;
      return { ...entry, time: minutesToTime(currentMinutes) };
    }

    // 2. PINNED ITEMS: If the user explicitly set a time (e.g., 19:30 dinner rez)
    if (entry.isFixed && entry.time) {
      currentMinutes = timeToMinutes(entry.time);
      return entry; 
    }

    // 3. THE WATERFALL: Calculate time based on the previous item
    const prevEntry = day.entries[index - 1];
    if (prevEntry) {
      // Calculate how long the PREVIOUS activity took
      // (Default to 2 hours for dining, 1.5 hours for standard activities)
      const prevDuration = prevEntry.isDining ? 120 : 90; 
      
      // Calculate transit time to get to THIS activity
      const transitTime = parseTransitMinutes(entry.transitNote);
      
      // Push the clock forward
      currentMinutes += prevDuration + transitTime;
    }

    // Assign the newly calculated time
    return { ...entry, time: minutesToTime(currentMinutes) };
  });

  return {
    ...day,
    entries: recalculatedEntries,
  };
}