/**
 * Format a number with thousand separators and optional decimals.
 *   formatNumber(1500)     → "1,500"
 *   formatNumber(1500.50)  → "1,500.50"
 *   formatNumber(1500.50, 0) → "1,500"
 */
export function formatNumber(value: number, decimals?: number): string {
  const fixed = decimals != null ? value.toFixed(decimals) : String(value);
  const [int, frac] = fixed.split(".");
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac != null ? `${withCommas}.${frac}` : withCommas;
}

/**
 * Format an amount (stored in smallest currency unit, e.g. cents) to a display string.
 *   formatAmount(150000)        → "$1,500"
 *   formatAmount(150050)        → "$1,500.50"
 */
export function formatAmount(amountInMinorUnit: number, symbol: string = "$"): string {
  const value = amountInMinorUnit / 100;
  const formatted = value === Math.floor(value) ? formatNumber(value, 0) : formatNumber(value, 2);
  return `${symbol}${formatted}`;
}

/**
 * Parse a user-entered amount string back to smallest unit (cents).
 */
export function parseAmountToCents(input: string): number {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}
