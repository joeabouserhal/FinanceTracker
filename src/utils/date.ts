/**
 * Date helpers — the app stores dates as "YYYY-MM-DD" strings (Postgres DATE).
 * Everything is built from LOCAL date parts: `toISOString()` is UTC-based and
 * would shift the day for any timezone east/west of UTC (e.g. UTC+3 devices
 * would write the previous day to the database).
 */

/** Today's date as YYYY-MM-DD (local). */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Format a Date as YYYY-MM-DD using local timezone parts. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string into a local Date (noon, so day arithmetic is
 * safe across DST). Returns null for anything else.
 */
export function parseISODate(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  // Reject invalid calendar dates (e.g. Feb 30 normalizes to Mar 2).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}
