export function parseTimeToMinutes(timeStr: string): number | null {
  try {
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = timeStr.trim().match(timeRegex);

    if (!match) return null;

    let [_, hoursStr, minutesStr, ampm] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    if (ampm) {
      ampm = ampm.toUpperCase();
      if (ampm === 'AM' && hours === 12) {
        hours = 0;
      } else if (ampm === 'PM' && hours !== 12) {
        hours += 12;
      }
    }

    return hours * 60 + minutes;
  } catch {
    return null;
  }
}

export function checkIfVenueIsClosed(
  visitDate: Date,
  visitTimeStr: string,
  weekdayDescriptions: string[]
): boolean {
  try {
    if (!visitTimeStr || !weekdayDescriptions || weekdayDescriptions.length === 0) {
      return false;
    }

    const jsDay = visitDate.getDay(); // 0=Sun through 6=Sat
    const googleIndex = jsDay === 0 ? 6 : jsDay - 1;

    const dayString = weekdayDescriptions[googleIndex];
    if (!dayString) return false;

    if (/closed/i.test(dayString)) {
      return true;
    }

    if (/open 24 hours/i.test(dayString)) {
      return false;
    }

    // dayString format is usually like "Monday: 9:00 AM – 5:00 PM"
    // Split by comma or something if multiple ranges, but let's assume a simpler format for parsing "9:00 AM – 5:00 PM"
    const colonIndex = dayString.indexOf(':');
    if (colonIndex === -1) return false;

    const timesPart = dayString.slice(colonIndex + 1).trim();
    // Sometimes there are multiple time ranges separated by commas, e.g., "9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM"
    const ranges = timesPart.split(',').map((r) => r.trim());

    const visitMinutes = parseTimeToMinutes(visitTimeStr);
    if (visitMinutes === null) return false;

    let isOpen = false;

    for (const range of ranges) {
      const parts = range.split('–').map((p) => p.trim());
      // Handle different dash types
      const separator = range.includes('–') ? '–' : range.includes('-') ? '-' : null;
      
      let startStr = parts[0];
      let endStr = parts[1];

      if (!separator) {
          const splitHyphen = range.split('-').map(p => p.trim());
          if (splitHyphen.length === 2) {
              startStr = splitHyphen[0];
              endStr = splitHyphen[1];
          } else {
             // weird format, skip
             continue;
          }
      }

      if (!startStr || !endStr) continue;

      const openMinutes = parseTimeToMinutes(startStr);
      const closeMinutes = parseTimeToMinutes(endStr);

      if (openMinutes === null || closeMinutes === null) continue;

      if (closeMinutes < openMinutes) {
        // Overnight hours
        if (visitMinutes >= openMinutes || visitMinutes <= closeMinutes) {
          isOpen = true;
          break;
        }
      } else {
        // Normal hours
        if (visitMinutes >= openMinutes && visitMinutes <= closeMinutes) {
          isOpen = true;
          break;
        }
      }
    }

    // If we successfully parsed ranges but didn't find one that includes the visit time, it's closed.
    // Wait, if no ranges were properly parsed, it will remain `isOpen = false`, so it will return `true` (closed).
    // Let's make sure we only return true if we actively parsed at least one range.
    let parsedAtLeastOneRange = false;
    for (const range of ranges) {
        const parts = range.split(/[-–]/).map(p => p.trim());
        if (parts.length === 2 && parseTimeToMinutes(parts[0]) !== null && parseTimeToMinutes(parts[1]) !== null) {
            parsedAtLeastOneRange = true;
            break;
        }
    }

    if (!parsedAtLeastOneRange) return false; // fail-safe

    return !isOpen;
  } catch (error) {
    return false;
  }
}