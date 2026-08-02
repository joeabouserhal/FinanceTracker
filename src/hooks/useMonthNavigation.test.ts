import { monthKey, monthLabel, monthBounds } from "./useMonthNavigation";

describe("monthKey", () => {
  it("formats zero-padded keys", () => {
    expect(monthKey(new Date(2026, 7, 15))).toBe("2026-08");
    expect(monthKey(new Date(2026, 0, 1))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 31))).toBe("2026-12");
  });
});

describe("monthLabel", () => {
  it("renders long month + year", () => {
    expect(monthLabel("2026-08")).toBe("August 2026");
    expect(monthLabel("2026-01")).toBe("January 2026");
  });
});

describe("monthBounds", () => {
  it("returns first and last day of the month", () => {
    expect(monthBounds("2026-08")).toEqual({ start: "2026-08-01", end: "2026-08-31" });
    expect(monthBounds("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("handles February incl. leap years", () => {
    expect(monthBounds("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthBounds("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
  });
});
