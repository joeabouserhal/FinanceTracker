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
