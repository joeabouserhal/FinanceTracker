import { getErrorMessage, isNetworkError } from "./errors";

describe("getErrorMessage", () => {
  it("extracts Error.message", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("passes through plain strings", () => {
    expect(getErrorMessage("direct")).toBe("direct");
  });

  it("falls back for non-error throws", () => {
    expect(getErrorMessage(undefined)).toBe("Unknown error");
    expect(getErrorMessage(null)).toBe("Unknown error");
    expect(getErrorMessage(42)).toBe("Unknown error");
    expect(getErrorMessage({ weird: true })).toBe("Unknown error");
  });
});

describe("isNetworkError", () => {
  it("treats fetch TypeErrors as network errors", () => {
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true);
  });

  it("recognizes network-ish messages", () => {
    expect(isNetworkError(new Error("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("Network Error"))).toBe(true);
    expect(isNetworkError("socket hang up")).toBe(true);
    expect(isNetworkError(new Error("request timed out"))).toBe(true);
  });

  it("does not treat server rejections as network errors", () => {
    expect(isNetworkError(new Error("duplicate key value violates unique constraint"))).toBe(false);
    expect(isNetworkError({ code: "23503", message: "insert or update on table" })).toBe(false);
    expect(isNetworkError("Not authenticated")).toBe(false);
  });
});
