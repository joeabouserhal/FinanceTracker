import { formatNumber } from "./currency";

describe("formatNumber", () => {
  it("adds thousand separators", () => {
    expect(formatNumber(1500)).toBe("1,500");
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0)).toBe("0");
  });

  it("preserves decimals", () => {
    expect(formatNumber(1500.5)).toBe("1,500.5");
    expect(formatNumber(1234567.891, 2)).toBe("1,234,567.89");
  });

  it("supports a decimals override (toFixed rounds)", () => {
    expect(formatNumber(1500.5, 0)).toBe("1,501");
    expect(formatNumber(1500, 2)).toBe("1,500.00");
  });

  it("handles small and negative numbers", () => {
    expect(formatNumber(0.25, 2)).toBe("0.25");
    expect(formatNumber(-1234.5, 1)).toBe("-1,234.5");
  });
});
