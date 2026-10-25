import { describe, it, expect } from "vitest";
import { computeDeduction, suggestCookUse } from "./deduct";

describe("suggestCookUse — what Cook & deduct suggests (PLAN 5.4)", () => {
  it("suggests nothing for a line without an amount, instead of the whole pack", () => {
    expect(suggestCookUse({ quantity: null, unit: null }, { quantity: 500, unit: "g" })).toEqual({
      suggestedUse: 0,
      convertible: true,
      quantified: false,
    });
  });

  it("reads a bare number as pieces: 2 eggs from a dozen is 2, not 12", () => {
    expect(suggestCookUse({ quantity: 2, unit: null }, { quantity: 12, unit: "pcs" })).toEqual({
      suggestedUse: 2,
      convertible: true,
      quantified: true,
    });
  });

  it("converts into the stock item's unit", () => {
    expect(suggestCookUse({ quantity: 300, unit: "g" }, { quantity: 1, unit: "kg" }).suggestedUse).toBe(0.3);
    const onions = { quantity: 1000, unit: "g", ingredient: { typicalPieceGrams: 150 } };
    expect(suggestCookUse({ quantity: 2, unit: "pcs" }, onions).suggestedUse).toBe(300);
  });

  it("never suggests more than is in stock", () => {
    expect(suggestCookUse({ quantity: 1, unit: "kg" }, { quantity: 500, unit: "g" }).suggestedUse).toBe(500);
  });

  it("flags an amount it can't convert and suggests nothing", () => {
    expect(suggestCookUse({ quantity: 2, unit: "cup" }, { quantity: 1000, unit: "g" })).toEqual({
      suggestedUse: 0,
      convertible: false,
      quantified: true,
    });
  });
});

describe("computeDeduction — the §27 scenario", () => {
  it("chicken 500 g, use 300 g -> 200 g remaining", () => {
    const r = computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 300, useUnit: "g" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.newQuantity).toBe(200);
      expect(r.usedUp).toBe(false);
      expect(r.overuse).toBe(false);
    }
  });

  it("rice 1000 g, use 200 g -> 800 g remaining", () => {
    const r = computeDeduction({ currentQuantity: 1000, currentUnit: "g", useQuantity: 200, useUnit: "g" });
    expect(r.ok && r.newQuantity).toBe(800);
  });
});

describe("computeDeduction — cross-unit", () => {
  it("stored in g, used in kg", () => {
    const r = computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 0.2, useUnit: "kg" });
    expect(r.ok && r.newQuantity).toBe(300);
  });

  it("stored in g, used in pcs (via piece weight)", () => {
    const r = computeDeduction({
      currentQuantity: 500,
      currentUnit: "g",
      useQuantity: 1,
      useUnit: "pcs",
      ingredient: { typicalPieceGrams: 170 },
    });
    expect(r.ok && r.newQuantity).toBe(330);
  });

  it("refuses when units can't be reconciled", () => {
    const r = computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 1, useUnit: "pcs" });
    expect(r.ok).toBe(false);
  });
});

describe("computeDeduction — edges", () => {
  it("using everything marks the item used up (but does not delete it)", () => {
    const r = computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 500, useUnit: "g" });
    expect(r.ok && r.newQuantity).toBe(0);
    expect(r.ok && r.usedUp).toBe(true);
  });

  it("over-using clamps to zero and flags overuse", () => {
    const r = computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 600, useUnit: "g" });
    expect(r.ok && r.newQuantity).toBe(0);
    expect(r.ok && r.overuse).toBe(true);
  });

  it("rejects non-positive amounts", () => {
    expect(computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 0, useUnit: "g" }).ok).toBe(false);
  });
});
