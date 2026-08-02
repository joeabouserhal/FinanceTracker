import { PALETTES, DEFAULT_THEME_ID } from "./palettes";

const REQUIRED_TOKENS = [
  "background",
  "surface",
  "ink",
  "muted",
  "accent",
  "income",
  "expense",
  "border",
  "inputBorder",
  "placeholder",
  "backdrop",
] as const;

describe("palettes", () => {
  it("defines the 6 expected themes including the default", () => {
    const ids = Object.keys(PALETTES);
    expect(ids.length).toBe(6);
    expect(ids).toContain(DEFAULT_THEME_ID);
    expect(PALETTES[DEFAULT_THEME_ID].name).toBe("Brutalist Dark");
  });

  it("every palette defines every token as a non-empty string", () => {
    for (const palette of Object.values(PALETTES)) {
      for (const token of REQUIRED_TOKENS) {
        expect(palette[token]).toEqual(expect.any(String));
        expect((palette[token] as string).length).toBeGreaterThan(0);
      }
    }
  });

  it("ids are unique and names are present", () => {
    const ids = Object.values(PALETTES).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of Object.values(PALETTES)) {
      expect(p.name.length).toBeGreaterThan(0);
      // every palette's id must be usable as a store key
      expect(p.id).toBeTruthy();
    }
  });
});
