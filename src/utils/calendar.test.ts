import { buildMonthGrid } from "./calendar";

describe("buildMonthGrid", () => {
  it("starts with blanks matching the first weekday (2026-08-01 is a Saturday)", () => {
    const grid = buildMonthGrid(2026, 8);
    // 6 leading blanks (Sun..Fri), then 1..31
    expect(grid.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(grid[6]).toBe(1);
    expect(grid[36]).toBe(31);
  });

  it("is always exactly 6 rows (42 cells) so the modal never shifts", () => {
    for (const [y, m] of [[2026, 1], [2026, 2], [2026, 12], [2024, 2], [2026, 8]] as const) {
      expect(buildMonthGrid(y, m)).toHaveLength(42);
    }
  });

  it("counts February days incl. leap years", () => {
    const nonLeap = buildMonthGrid(2026, 2).filter((c) => c !== null);
    expect(nonLeap).toHaveLength(28);
    const leap = buildMonthGrid(2024, 2).filter((c) => c !== null);
    expect(leap).toHaveLength(29);
  });

  it("never has more than 6 rows", () => {
    expect(buildMonthGrid(2026, 8).length).toBeLessThanOrEqual(42);
  });
});
