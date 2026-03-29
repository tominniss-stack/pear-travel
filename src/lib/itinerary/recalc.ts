import type { DayItinerary, ItineraryEntry, LockedAccommodation, TripIntake, Itinerary } from '@/types';

export function parseTime(timeStr?: string): number {
  if (!timeStr) return 9 * 60; 
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 9 * 60;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 9 * 60;
  return (hours * 60) + minutes;
}

export function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function parseTransitMinutes(note?: string): number {
  if (!note) return 0;
  const match = note.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : 0;
}

type RecalcContext = { intake: TripIntake; totalDays: number; accommodations?: LockedAccommodation[] };
type RecalcStep = (day: DayItinerary, context: RecalcContext) => DayItinerary;

const injectLogisticalAnchors: RecalcStep = (day, { intake, totalDays, accommodations }) => {
  const isFirstDay = day.dayNumber === 1;
  const isLastDay = day.dayNumber === totalDays;
  
  let entries = [...day.entries];

  if (isFirstDay && intake?.transitDetails && entries[0]?.type !== 'TRAVEL') {
    entries.unshift({
      id: `arrival-flight-${day.dayNumber}`,
      type: 'TRAVEL',
      locationName: intake.transitDetails.outbound?.station || 'Arrival Point',
      activityDescription: `Inbound ${intake.transitDetails.mode} arrival`,
      time: intake.transitDetails.outbound?.time || '10:00',
      transitMethod: 'Start of Day',
      estimatedCostGBP: 0,
      googleMapsUrl: '',
      isDining: false,
      isFixed: true
    });
  }

  if (isLastDay && intake?.transitDetails && entries[entries.length - 1]?.type !== 'TRAVEL') {
    entries.push({
      id: `departure-flight-${day.dayNumber}`,
      type: 'TRAVEL',
      locationName: intake.transitDetails.return?.station || 'Departure Point',
      activityDescription: `Outbound ${intake.transitDetails.mode} departure`,
      time: intake.transitDetails.return?.time || '18:00',
      transitMethod: 'Taxi / Rideshare',
      estimatedCostGBP: 0,
      googleMapsUrl: '',
      isDining: false,
      isFixed: true
    });
  }

  const currentNightHotel = accommodations?.find(a => day.dayNumber >= a.checkInDay && day.dayNumber < a.checkOutDay);
  const previousNightHotel = accommodations?.find(a => day.dayNumber > a.checkInDay && day.dayNumber <= a.checkOutDay);

  const updatedEntries = entries.map((e, idx) => {
    let updated = { ...e };
    
    if (!updated.durationMinutes) {
      if (updated.isDining) updated.durationMinutes = 90;
      else if (updated.type === 'ACTIVITY') updated.durationMinutes = 120;
      else if (updated.type === 'REST_STOP') updated.durationMinutes = 30;
      else if (updated.type === 'ACCOMMODATION') updated.durationMinutes = (isFirstDay && idx <= 1) ? 30 : 0;
      else updated.durationMinutes = 0;
    }

    if (updated.type === 'ACCOMMODATION') {
      const isStart = idx === 0 || (idx === 1 && entries[0].type === 'TRAVEL');
      const isEnd = idx === entries.length - 1 || (idx === entries.length - 2 && entries[entries.length - 1].type === 'TRAVEL');

      if (isStart) {
        const morningHotel = isFirstDay ? currentNightHotel : previousNightHotel;
        updated.locationName = morningHotel?.locationName || (intake?.bookingMode === 'booked' ? intake.accommodation : 'Pending Accommodation');
        updated.placeId = morningHotel?.placeId || undefined;
        if (!morningHotel?.placeId && intake?.bookingMode === 'booked') updated.timeWarning = "Booking Needed.";
      } else if (isEnd) {
        const eveningHotel = isLastDay ? previousNightHotel : currentNightHotel;
        updated.locationName = eveningHotel?.locationName || (intake?.bookingMode === 'booked' ? intake.accommodation : 'Pending Accommodation');
        updated.placeId = eveningHotel?.placeId || undefined;
      }
    }

    return updated;
  });

  return { ...day, entries: updatedEntries };
};

const calculateTransitDeltas: RecalcStep = (day) => {
  let currentMinutes = parseTime(day.entries[0]?.time);
  
  const updated = day.entries.map((entry, idx) => {
    if (idx === 0) {
      currentMinutes = entry.time ? parseTime(entry.time) : currentMinutes;
      return entry;
    }
    
    if (entry.isFixed && entry.time) {
      currentMinutes = parseTime(entry.time);
      return entry;
    }

    const prev = day.entries[idx - 1];
    const duration = prev.durationMinutes || 0;
    const transit = parseTransitMinutes(entry.transitNote);
    
    currentMinutes += duration + transit;
    return { ...entry, time: formatTime(currentMinutes) };
  });

  return { ...day, entries: updated };
};

const detectScheduleConflicts: RecalcStep = (day) => {
  const updated = day.entries.map((entry, idx) => {
    if (idx === 0 || !entry.isFixed || !entry.time) return { ...entry, conflict: undefined };
    
    const prev = day.entries[idx - 1];
    if (!prev.time) return entry;

    const endTimeOfPrev = parseTime(prev.time) + (prev.durationMinutes || 0) + parseTransitMinutes(entry.transitNote);
    const startTimeOfCurrent = parseTime(entry.time);
    
    if (startTimeOfCurrent < endTimeOfPrev) {
      const overlap = endTimeOfPrev - startTimeOfCurrent;
      return { 
        ...entry, 
        conflict: { 
          type: 'overlap' as const,
          conflictMinutes: overlap, // <--- Change this from overlapMinutes to conflictMinutes
          message: `Starts ${overlap}m before previous activity completes.` 
        } 
      };
    }
    return { ...entry, conflict: undefined };
  });

  return { ...day, entries: updated };
};

export const recalculateItinerary = (itinerary: Itinerary, intake: TripIntake): Itinerary => {
  const pipeline = [injectLogisticalAnchors, calculateTransitDeltas, detectScheduleConflicts];
  const nextDays = itinerary.days.map(day => 
    pipeline.reduce((d, step) => step(d, { 
      intake, 
      totalDays: itinerary.days.length, 
      accommodations: itinerary.lockedAccommodations 
    }), day)
  );
  return { ...itinerary, days: nextDays };
};

export const recalculateDay = (
  day: DayItinerary,
  totalDays: number = 1,
  intake?: TripIntake,
  accommodations?: LockedAccommodation[]
): DayItinerary => {
  const safeIntake: TripIntake = intake || {
    destination: '',
    bookingMode: 'planning',
    duration: totalDays,
    accommodation: '',
    interests: [],
    budgetGBP: 0,
    diningProfile: 'mid-range',
    anchorPoints: ''
  };

  const dummyItinerary: Itinerary = {
    id: 'shim-temp',
    days: [day],
    totalEstimatedCostGBP: 0,
    generatedAt: new Date().toISOString(),
    lockedAccommodations: accommodations
  };

  return recalculateItinerary(dummyItinerary, safeIntake).days[0];
};