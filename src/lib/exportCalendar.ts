import type { Itinerary } from '@/types';
import { addDays, parse, format, addMinutes } from 'date-fns';
import { parseTransitMinutes } from '@/lib/itinerary/recalc';

export function generateICS(itinerary: Itinerary, startDateStr: string, destination: string): string {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Pear Travel//EN\r\nCALSCALE:GREGORIAN\r\n';

  // Safely parse the YYYY-MM-DD string as a local midnight date, not UTC midnight
  const [year, month, dayStr] = startDateStr.split('T')[0].split('-');
  const startDate = new Date(Number(year), Number(month) - 1, Number(dayStr));

  itinerary.days?.forEach(day => {
    const currentDayDate = addDays(startDate, day.dayNumber - 1);

    day.entries.forEach((entry, idx) => {
      if (!entry.time) return;

      // Parse the HH:mm string into a real Date object
      const parsedTime = parse(entry.time, 'HH:mm', currentDayDate);
      if (isNaN(parsedTime.getTime())) return;

      let endTime = addMinutes(parsedTime, 60); // Default 1 hour
      let transitMinutes = 0;
      const nextEntry = day.entries[idx + 1];
      
      // Calculate true end time by subtracting transit time from the next entry's start time
      if (nextEntry?.time) {
        const nextParsed = parse(nextEntry.time, 'HH:mm', currentDayDate);
        if (!isNaN(nextParsed.getTime()) && nextParsed > parsedTime) {
          if (nextEntry.transitNote) {
            transitMinutes = parseTransitMinutes(nextEntry.transitNote);
          }
          endTime = addMinutes(nextParsed, -transitMinutes);
          // Fallback if transit calculation forces end time before start time
          if (endTime <= parsedTime) endTime = addMinutes(parsedTime, 30); 
        }
      }

      // Format as "Floating Time" (YYYYMMDDTHHmmss) without the 'Z'
      const startStr = format(parsedTime, "yyyyMMdd'T'HHmmss");
      const endStr = format(endTime, "yyyyMMdd'T'HHmmss");

      // Sanitize text for ICS format
      const summary = entry.locationName ? entry.locationName.replace(/,/g, '\\,') : 'Travel Activity';
      const description = entry.activityDescription 
        ? entry.activityDescription.replace(/\n/g, '\\n').replace(/,/g, '\\,') 
        : '';

      // Write Main Activity Event
      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:${entry.id}@peartravel.app\r\n`;
      ics += `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}\r\n`;
      ics += `DTSTART:${startStr}\r\n`;
      ics += `DTEND:${endStr}\r\n`;
      ics += `SUMMARY:${summary}\r\n`;
      if (description) ics += `DESCRIPTION:${description}\r\n`;
      if (entry.locationName) ics += `LOCATION:${summary}, ${destination}\r\n`;
      ics += 'END:VEVENT\r\n';

      // Write Dedicated Transit Event
      if (transitMinutes > 0 && nextEntry) {
        const transitStart = format(endTime, "yyyyMMdd'T'HHmmss");
        const transitEnd = format(addMinutes(endTime, transitMinutes), "yyyyMMdd'T'HHmmss");
        
        ics += 'BEGIN:VEVENT\r\n';
        ics += `UID:transit-${entry.id}@peartravel.app\r\n`;
        ics += `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}\r\n`;
        ics += `DTSTART:${transitStart}\r\n`;
        ics += `DTEND:${transitEnd}\r\n`;
        ics += `SUMMARY:🚕 Transit: ${nextEntry.transitNote}\r\n`;
        ics += 'END:VEVENT\r\n';
      }
    });
  });

  ics += 'END:VCALENDAR\r\n';
  return ics;
}