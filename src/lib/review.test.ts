import { describe, it, expect } from "vitest";
import { inferStorage, lineEstimate, type ReviewRef } from "./review";
import type { ShelfLifeRuleish } from "./expiry";

const ref: ReviewRef = {
  categories: [
    { id: "c-dairy", name: "Dairy", defaultStorage: "REFRIGERATOR" },
    { id: "c-grain", name: "Grain", defaultStorage: "PANTRY" },
    { id: "c-frozen", name: "Frozen", defaultStorage: "FREEZER" },
  ],
  ingredients: [
    { id: "i-rice", name: "rice", categoryId: "c-grain" },
    { id: "i-milk", name: "milk", categoryId: "c-dairy" },
  ],
};

const rules: ShelfLifeRuleish[] = [
  { ingredientId: "i-milk", categoryName: null, storage: "REFRIGERATOR", opened: false, typicalDays: 7, minDays: 5, maxDays: 10 },
  { ingredientId: null, categoryName: "Dairy", storage: "REFRIGERATOR", opened: false, typicalDays: 10, minDays: 7, maxDays: 14 },
  { ingredientId: null, categoryName: "Dairy", storage: "FREEZER", opened: false, typicalDays: 90, minDays: 60, maxDays: 120 },
];

const bought = new Date("2026-10-25T08:00:00Z");
const daysAfter = (d: Date | null) => (d ? Math.round((d.getTime() - bought.getTime()) / 86_400_000) : null);

describe("inferStorage — a line starts where its food usually lives (PLAN 5.4)", () => {
  it("uses the ingredient's category: rice goes in the pantry, not the fridge", () => {
    expect(inferStorage({ ingredientName: "Rice", categoryId: "" }, ref)).toBe("PANTRY");
  });

  it("prefers the line's own category over the ingredient's", () => {
    expect(inferStorage({ ingredientName: "milk", categoryId: "c-frozen" }, ref)).toBe("FREEZER");
  });

  it("falls back to the fridge when nothing is known", () => {
    expect(inferStorage({ ingredientName: "mystery snack", categoryId: "" }, ref)).toBe("REFRIGERATOR");
  });
});

describe("lineEstimate — Review shows what the commit will save", () => {
  it("uses the ingredient rule first", () => {
    const est = lineEstimate({ ingredientName: "Milk", categoryId: "", storageLocation: "REFRIGERATOR" }, ref, rules, bought);
    expect(est.source).toBe("ESTIMATED");
    expect(est.matchedBy).toBe("ingredient");
    expect(daysAfter(est.expiryDate)).toBe(7);
  });

  it("follows a storage change", () => {
    const est = lineEstimate({ ingredientName: "", categoryId: "c-dairy", storageLocation: "FREEZER" }, ref, rules, bought);
    expect(daysAfter(est.expiryDate)).toBe(90);
  });

  it("never invents a date when no rule matches", () => {
    const est = lineEstimate({ ingredientName: "", categoryId: "", storageLocation: "PANTRY" }, ref, rules, bought);
    expect(est).toMatchObject({ source: "UNKNOWN", expiryDate: null });
  });
});
