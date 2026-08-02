/**
 * Calendar grid math for the in-app date picker.
 * Months are 1-based; weeks start on Sunday (matches en-US calendars and
 * `Date.prototype.getDay()`, where 0 = Sunday).
 */

export const WEEKDAY_LETTERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Build a fixed-height month grid: `null` for leading/trailing blanks, day
 * numbers for real days. Always exactly 42 cells (6 rows of 7), so the picker
 * never changes size between months (5-week months get a trailing blank row).
 */
export function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);
  return cells;
}
