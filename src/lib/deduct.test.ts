import { describe, it, expect } from "vitest";
import { computeDeduction } from "./deduct";

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
