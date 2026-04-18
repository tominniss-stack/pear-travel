/**
 * Time clash detection utilities for the Soft Clash Opening Hours Engine.
 *
 * Google Places `weekdayDescriptions` format examples:
 *   "Monday: 9:00 AM – 5:00 PM"
 *   "Tuesday: Closed"
 *   "Wednesday: Open 24 hours"
 *   "Thursday: 11:00 AM – 2:00 PM, 5:00 PM – 10:00 PM"  (split hours)
 *
 * The simpler `openingHours: { open: string; close: string }` format stored on
 * `ItineraryEntry` uses 24-hour "HH:mm" strings (e.g. "09:00", "22:30").
 */

/** Convert a 24-hour "HH:mm" string to total minutes since midnight. */
function toMinutes(hhmm: string): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const parts = hhmm.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Check whether a scheduled time falls outside the venue's opening window.
 *
 * Uses the simple `{ open, close }` format stored on `ItineraryEntry.openingHours`.
 * Both `open` and `close` are expected as 24-hour "HH:mm" strings.
 *
 * Returns `true` (closed / clash) only when we have enough data to be certain.
 * Returns `false` (no clash / unknown) on any missing or unparseable data so we
 * never produce false positives.
 *
 * Handles overnight windows (e.g. open: "22:00", close: "02:00").
 */
export function checkIfClosed(
  timeString: string | undefined | null,
  openHHmm: string | undefined | null,
  closeHHmm: string | undefined | null,
): boolean {
  // Defensive: if any piece of data is missing, assume no clash.
  if (!timeString || !openHHmm || !closeHHmm) return false;

  const scheduled = toMinutes(timeString);
  const open = toMinutes(openHHmm);
  const close = toMinutes(closeHHmm);

  if (scheduled === null || open === null || close === null) return false;

  // Venue is open 24 hours — never a clash.
  if (open === 0 && close === 0) return false;
  // open === close is ambiguous — skip.
  if (open === close) return false;

  if (close > open) {
    // Normal window: e.g. 09:00 – 22:00
    return scheduled < open || scheduled >= close;
  } else {
    // Overnight window: e.g. 22:00 – 02:00
    // Closed only if the time falls in the gap between close and open.
    return scheduled >= close && scheduled < open;
  }
}

/**
 * Parse a single Google `weekdayDescriptions` line for a given day index
 * (0 = Monday … 6 = Sunday, matching the Google API order) and check whether
 * `timeString` (24-hour "HH:mm") falls outside the operating window.
 *
 * This is the richer variant used when we have live Places API data.
 * Returns `false` (no clash) on any parse failure to avoid false positives.
 */
export function checkIfClosedFromWeekdayDescriptions(
  timeString: string | undefined | null,
  currentDayIndex: number,
  weekdayDescriptions: string[] | undefined | null,
): boolean {
  if (!timeString || !weekdayDescriptions || weekdayDescriptions.length === 0) return false;

  // Google returns 7 entries starting Monday (index 0).
  const idx = ((currentDayIndex % 7) + 7) % 7;
  const line = weekdayDescriptions[idx];
  if (!line) return false;

  // Strip the day name prefix ("Monday: ...")
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return false;
  const hoursStr = line.slice(colonIdx + 1).trim();

  // Explicit closed day.
  if (/^closed$/i.test(hoursStr)) return true;

  // Open 24 hours — never a clash.
  if (/open 24 hours/i.test(hoursStr)) return false;

  const scheduled = toMinutes(timeString);
  if (scheduled === null) return false;

  /**
   * Parse a 12-hour time token like "9:00 AM" or "10:30 PM" → minutes.
   * Returns null on failure.
   */
  const parse12h = (token: string): number | null => {
    const m = token.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const period = m[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  // Split on " – " (en-dash) or " - " (hyphen) to get segments.
  // A venue may have split hours: "11:00 AM – 2:00 PM, 5:00 PM – 10:00 PM"
  const segments = hoursStr.split(',').map(s => s.trim());

  for (const segment of segments) {
    const parts = segment.split(/\s[–-]\s/);
    if (parts.length < 2) continue;
    const open = parse12h(parts[0]);
    const close = parse12h(parts[1]);
    if (open === null || close === null) continue;

    if (close > open) {
      // Normal window
      if (scheduled >= open && scheduled < close) return false; // within this segment → open
    } else {
      // Overnight window
      if (scheduled >= open || scheduled < close) return false;
    }
  }

  // Fell through all segments without a match → closed at this time.
  return true;
}
