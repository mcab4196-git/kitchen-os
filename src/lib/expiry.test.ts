import { describe, it, expect } from "vitest";
import {
  estimateExpiry,
  classifyStatus,
  daysUntil,
  relativeLabel,
  type ShelfLifeRuleish,
} from "./expiry";

const CHICKEN = "ing-chicken";
const rules: ShelfLifeRuleish[] = [
  { ingredientId: CHICKEN, categoryName: null, storage: "REFRIGERATOR", opened: false, typicalDays: 2, minDays: 1, maxDays: 2 },
  { ingredientId: CHICKEN, categoryName: null, storage: "FREEZER", opened: false, typicalDays: 270, minDays: 180, maxDays: 365 },
  { ingredientId: null, categoryName: "Meat", storage: "REFRIGERATOR", opened: false, typicalDays: 3, minDays: 2, maxDays: 4 },
  { ingredientId: null, categoryName: "Vegetable", storage: "REFRIGERATOR", opened: false, typicalDays: 7, minDays: 4, maxDays: 10 },
];

const purchase = new Date("2026-08-21T00:00:00Z");

describe("estimateExpiry — rule selection", () => {
  it("prefers an ingredient-specific rule over the category fallback", () => {
    const r = estimateExpiry({ purchaseDate: purchase, storage: "REFRIGERATOR", opened: false, ingredientId: CHICKEN, categoryName: "Meat", rules });
    expect(r.source).toBe("ESTIMATED");
    expect(r.matchedBy).toBe("ingredient");
    expect(r.expiryDate).toEqual(new Date("2026-08-23T00:00:00Z")); // +2 days
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("falls back to the category rule when the ingredient is unknown", () => {
    const r = estimateExpiry({ purchaseDate: purchase, storage: "REFRIGERATOR", opened: false, ingredientId: null, categoryName: "Meat", rules });
    expect(r.matchedBy).toBe("category");
    expect(r.expiryDate).toEqual(new Date("2026-08-24T00:00:00Z")); // +3 days
    expect(r.confidence).toBeLessThan(0.75); // category match is less certain
  });

  it("uses the storage-specific rule (freezer extends life dramatically)", () => {
    const r = estimateExpiry({ purchaseDate: purchase, storage: "FREEZER", opened: false, ingredientId: CHICKEN, rules });
    expect(r.expiryDate).toEqual(new Date("2027-05-18T00:00:00Z")); // +270 days
  });

  it("is honest: returns UNKNOWN when no rule matches, never invents a date", () => {
    const r = estimateExpiry({ purchaseDate: purchase, storage: "PANTRY", opened: false, ingredientId: "ing-mystery", categoryName: "Other", rules });
    expect(r.source).toBe("UNKNOWN");
    expect(r.expiryDate).toBeNull();
    expect(r.confidence).toBe(0);
  });
});

describe("classifyStatus", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  it("EXPIRED for past dates", () => {
    expect(classifyStatus(new Date("2026-08-19"), "ESTIMATED", now)).toBe("EXPIRED");
  });
  it("CRITICAL for today/tomorrow", () => {
    expect(classifyStatus(new Date("2026-08-22T12:00:00Z"), "ESTIMATED", now)).toBe("CRITICAL");
  });
  it("SOON within three days", () => {
    expect(classifyStatus(new Date("2026-08-24T12:00:00Z"), "EXACT", now)).toBe("SOON");
  });
  it("FRESH beyond three days", () => {
    expect(classifyStatus(new Date("2026-08-30T12:00:00Z"), "EXACT", now)).toBe("FRESH");
  });
  it("UNKNOWN when no date or source is UNKNOWN", () => {
    expect(classifyStatus(null, "UNKNOWN", now)).toBe("UNKNOWN");
    expect(classifyStatus(new Date("2026-08-30"), "UNKNOWN", now)).toBe("UNKNOWN");
  });
});

describe("daysUntil / relativeLabel", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  it("counts whole days", () => {
    expect(daysUntil(new Date("2026-08-23T12:00:00Z"), now)).toBe(2);
  });
  it("labels relative time", () => {
    expect(relativeLabel(new Date("2026-08-22T12:00:00Z"), "EXACT", now)).toBe("tomorrow");
    expect(relativeLabel(null, "UNKNOWN", now)).toBe("No date");
  });
  it("returns an absolute date when asked (accessibility preference)", () => {
    const label = relativeLabel(new Date("2026-09-07T12:00:00Z"), "EXACT", now, { absolute: true });
    expect(label).toMatch(/7/);
    expect(label).not.toMatch(/day/);
    expect(relativeLabel(null, "UNKNOWN", now, { absolute: true })).toBe("No date");
  });
});

describe("estimateExpiry — category fallbacks across storage locations", () => {
  const freezerRules: ShelfLifeRuleish[] = [
    { ingredientId: null, categoryName: "Meat", storage: "FREEZER", opened: false, typicalDays: 240, minDays: 180, maxDays: 365 },
    { ingredientId: null, categoryName: "Fruit", storage: "PANTRY", opened: false, typicalDays: 6, minDays: 3, maxDays: 14 },
  ];
  const p = new Date("2026-08-21T00:00:00Z");

  it("estimates meat in the freezer via the category rule", () => {
    const r = estimateExpiry({ purchaseDate: p, storage: "FREEZER", opened: false, ingredientId: null, categoryName: "Meat", rules: freezerRules });
    expect(r.source).toBe("ESTIMATED");
    expect(r.matchedBy).toBe("category");
    expect(r.expiryDate).toEqual(new Date("2027-04-18T00:00:00Z")); // +240 days
  });

  it("estimates fruit in the pantry via the category rule", () => {
    const r = estimateExpiry({ purchaseDate: p, storage: "PANTRY", opened: false, ingredientId: null, categoryName: "Fruit", rules: freezerRules });
    expect(r.source).toBe("ESTIMATED");
    expect(r.expiryDate).toEqual(new Date("2026-08-27T00:00:00Z")); // +6 days
  });

  it("falls back to pantry rules for cupboard storage", () => {
    const r = estimateExpiry({ purchaseDate: p, storage: "CUPBOARD", opened: false, ingredientId: null, categoryName: "Fruit", rules: freezerRules });
    expect(r.source).toBe("ESTIMATED");
    expect(r.expiryDate).toEqual(new Date("2026-08-27T00:00:00Z"));
  });
});

describe("estimateExpiry — opened counts from the opening date", () => {
  const milkRules: ShelfLifeRuleish[] = [
    { ingredientId: "milk", categoryName: null, storage: "REFRIGERATOR", opened: false, typicalDays: 7, minDays: 5, maxDays: 10 },
    { ingredientId: "milk", categoryName: null, storage: "REFRIGERATOR", opened: true, typicalDays: 4, minDays: 3, maxDays: 5 },
  ];
  const purchase = new Date("2026-08-21T00:00:00Z");

  it("uses the opened rule from the opening date (capped at unopened life)", () => {
    // Opened on day 2 -> opened+4 = day 6, which is <= unopened day 7 -> day 6.
    const openedAt = new Date("2026-08-23T00:00:00Z");
    const r = estimateExpiry({ purchaseDate: purchase, storage: "REFRIGERATOR", opened: true, openedAt, ingredientId: "milk", rules: milkRules });
    expect(r.source).toBe("ESTIMATED");
    expect(r.expiryDate).toEqual(new Date("2026-08-27T00:00:00Z")); // openedAt + 4
  });

  it("never exceeds the unopened shelf life", () => {
    // Opened late (day 6): opened+4 = day 10, but unopened caps at day 7.
    const openedAt = new Date("2026-08-27T00:00:00Z");
    const r = estimateExpiry({ purchaseDate: purchase, storage: "REFRIGERATOR", opened: true, openedAt, ingredientId: "milk", rules: milkRules });
    expect(r.expiryDate).toEqual(new Date("2026-08-28T00:00:00Z")); // purchase + 7 (cap)
  });

  it("derives a shorter opened life when no opened rule exists", () => {
    const vegRule: ShelfLifeRuleish[] = [
      { ingredientId: null, categoryName: "Vegetable", storage: "REFRIGERATOR", opened: false, typicalDays: 8, minDays: 5, maxDays: 10 },
    ];
    const openedAt = new Date("2026-08-22T00:00:00Z");
    const r = estimateExpiry({ purchaseDate: purchase, storage: "REFRIGERATOR", opened: true, openedAt, categoryName: "Vegetable", rules: vegRule });
    // openedAt + round(8 * 0.5) = openedAt + 4 = Aug 26 (<= unopened Aug 29)
    expect(r.expiryDate).toEqual(new Date("2026-08-26T00:00:00Z"));
  });

  it("unopened items are unaffected", () => {
    const r = estimateExpiry({ purchaseDate: purchase, storage: "REFRIGERATOR", opened: false, ingredientId: "milk", rules: milkRules });
    expect(r.expiryDate).toEqual(new Date("2026-08-28T00:00:00Z")); // purchase + 7
  });
});
