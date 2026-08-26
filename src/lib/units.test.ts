import { describe, it, expect } from "vitest";
import { normalizeUnit, unitKind, convert, canConvert, tidy } from "./units";

describe("normalizeUnit", () => {
  it("passes through canonical tokens", () => {
    expect(normalizeUnit("g")).toBe("g");
    expect(normalizeUnit("kg")).toBe("kg");
  });
  it("resolves common spellings and plurals", () => {
    expect(normalizeUnit("grams")).toBe("g");
    expect(normalizeUnit("Kilograms")).toBe("kg");
    expect(normalizeUnit("litre")).toBe("l");
    expect(normalizeUnit("pieces")).toBe("pcs");
    expect(normalizeUnit("x")).toBe("pcs");
  });
  it("trims trailing punctuation and whitespace", () => {
    expect(normalizeUnit("  kg. ")).toBe("kg");
  });
  it("returns null for unknown units", () => {
    expect(normalizeUnit("furlong")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
  });
});

describe("unitKind", () => {
  it("classifies families", () => {
    expect(unitKind("g")).toBe("MASS");
    expect(unitKind("ml")).toBe("VOLUME");
    expect(unitKind("pcs")).toBe("COUNT");
  });
});

describe("convert — same family", () => {
  it("mass", () => {
    expect(convert(1, "kg", "g")).toBe(1000);
    expect(convert(500, "g", "kg")).toBe(0.5);
    expect(tidy(convert(1, "lb", "g")!)).toBe(453.592);
  });
  it("volume", () => {
    expect(convert(1, "l", "ml")).toBe(1000);
    expect(convert(1, "tbsp", "tsp")).toBeCloseTo(3, 1);
  });
});

describe("convert — cross family via piece weight", () => {
  const chicken = { typicalPieceGrams: 170 };
  it("count -> mass", () => {
    expect(convert(2, "pcs", "g", chicken)).toBe(340);
  });
  it("mass -> count", () => {
    expect(convert(340, "g", "pcs", chicken)).toBe(2);
  });
  it("refuses cross-family when piece weight is unknown", () => {
    expect(convert(2, "pcs", "g")).toBeNull();
    expect(convert(2, "pcs", "g", { typicalPieceGrams: null })).toBeNull();
  });
  it("refuses volume<->mass (no density modelled)", () => {
    expect(convert(1, "l", "g", chicken)).toBeNull();
  });
});

describe("canConvert", () => {
  it("reports feasibility", () => {
    expect(canConvert("kg", "g")).toBe(true);
    expect(canConvert("pcs", "g", { typicalPieceGrams: 60 })).toBe(true);
    expect(canConvert("pcs", "g")).toBe(false);
    expect(canConvert("g", "ml")).toBe(false);
  });
});

describe("units — edge cases", () => {
  it("returns null for incompatible dimensions", () => {
    expect(convert(1, "g", "ml", { typicalPieceGrams: null })).toBeNull();
  });
  it("converts count to mass via typical piece weight and back", () => {
    const grams = convert(2, "pcs", "g", { typicalPieceGrams: 60 });
    expect(grams).toBe(120);
    const pieces = convert(120, "g", "pcs", { typicalPieceGrams: 60 });
    expect(pieces).toBe(2);
  });
  it("is case- and plural-insensitive for unit names", () => {
    expect(normalizeUnit("Grams")).toBe("g");
    expect(normalizeUnit("KG")).toBe("kg");
  });
});
