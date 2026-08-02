import { todayISO, toISODate, parseISODate } from "./date";

describe("todayISO", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("toISODate", () => {
  it("formats local parts with zero padding", () => {
    expect(toISODate(new Date(2026, 7, 15))).toBe("2026-08-15");
    expect(toISODate(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("is timezone-safe: a UTC+3 local midnight still formats as the same day", () => {
    // 2026-08-15 00:30 local in UTC+3 == 2026-08-14 21:30 UTC
    const local = new Date(2026, 7, 15, 0, 30, 0);
    expect(toISODate(local)).toBe("2026-08-15");
    // toISOString() (UTC) would have returned "2026-08-14"
    expect(local.toISOString().slice(0, 10)).toBe("2026-08-14");
  });
});

describe("parseISODate", () => {
  it("parses valid dates", () => {
    const d = parseISODate("2026-08-15");
    expect(d).not.toBeNull();
    expect(toISODate(d!)).toBe("2026-08-15");
  });

  it("round-trips through toISODate", () => {
    for (const iso of ["2026-01-01", "2024-02-29", "2026-12-31"]) {
      expect(toISODate(parseISODate(iso)!)).toBe(iso);
    }
  });

  it("rejects invalid input", () => {
    expect(parseISODate("")).toBeNull();
    expect(parseISODate("2026-13-01")).toBeNull();
    expect(parseISODate("2026-02-30")).toBeNull(); // normalizes to Mar 2
    expect(parseISODate("26-08-15")).toBeNull();
    expect(parseISODate("2026/08/15")).toBeNull();
    expect(parseISODate("not-a-date")).toBeNull();
  });
});
