import { describe, it, expect } from "vitest";
import { validateAndClean, redactSensitive } from "./schemas";

describe("validateAndClean — happy path", () => {
  it("parses a normal receipt and normalizes units", () => {
    const res = validateAndClean({
      store: "SuperMart",
      purchaseDate: "2026-08-21",
      currency: "eur",
      total: 24.5,
      items: [
        { rawName: "Chicken Breast 500G", quantity: 500, unit: "G", price: 5.99, category: "Meat" },
        { rawName: "Milk 1L", quantity: 1, unit: "litre", price: 1.2, category: "Dairy" },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.currency).toBe("EUR");
      expect(res.data.purchaseDate).toEqual(new Date("2026-08-21"));
      expect(res.data.items[0].unit).toBe("g");
      expect(res.data.items[1].unit).toBe("l");
      expect(res.data.items[0].confidence).toBeGreaterThan(0.9);
    }
  });
});

describe("validateAndClean — coercion + robustness", () => {
  it("coerces numeric strings and comma decimals", () => {
    const res = validateAndClean({
      items: [{ rawName: "Rice", quantity: "2", unit: "kg", price: "3,49" }],
    });
    expect(res.ok && res.data.items[0].quantity).toBe(2);
    expect(res.ok && res.data.items[0].price).toBe(3.49);
  });

  it("drops items with no name", () => {
    const res = validateAndClean({ items: [{ rawName: "  " }, { rawName: "Eggs" }] });
    expect(res.ok && res.data.items.length).toBe(1);
  });

  it("flags low confidence when a unit can't be mapped", () => {
    const res = validateAndClean({ items: [{ rawName: "Mystery", quantity: 1, unit: "blorp" }] });
    if (res.ok) {
      expect(res.data.items[0].unit).toBeNull();
      expect(res.data.items[0].unitRaw).toBe("blorp");
      expect(res.data.items[0].confidence).toBeLessThan(0.85);
    }
  });

  it("nulls out negative prices/quantities rather than trusting them", () => {
    const res = validateAndClean({ items: [{ rawName: "Odd", quantity: -3, price: -1 }] });
    expect(res.ok && res.data.items[0].quantity).toBeNull();
    expect(res.ok && res.data.items[0].price).toBeNull();
  });

  it("rejects a totally malformed payload", () => {
    const res = validateAndClean({ items: "not-an-array" });
    expect(res.ok).toBe(false);
  });
});

describe("redactSensitive", () => {
  it("removes card-like digit runs", () => {
    expect(redactSensitive("VISA 4111 1111 1111 1111")).toContain("[redacted]");
    expect(redactSensitive("Corner Shop")).toBe("Corner Shop");
  });
});

import { simplifyProductName } from "./schemas";

describe("simplifyProductName", () => {
  it("strips size tokens and brand noise for lookup", () => {
    expect(simplifyProductName("Chicken Breast 500G")).toBe("chicken breast");
    expect(simplifyProductName("Barilla Penne Rigate 500g")).toBe("barilla penne rigate");
    expect(simplifyProductName("Milk 1L")).toBe("milk");
    expect(simplifyProductName("Eggs 10pcs")).toBe("eggs");
    expect(simplifyProductName("Tomatoes 0,5 kg")).toBe("tomatoes");
  });
});

import { reviewedItemsSchema } from "./schemas";

describe("reviewedItemsSchema", () => {
  it("accepts a valid reviewed payload", () => {
    const r = reviewedItemsSchema.safeParse([
      {
        receiptItemId: "ri1",
        rawName: "Chicken Breast 500G",
        include: true,
        productName: "Chicken Breast 500G",
        ingredientName: "chicken breast",
        categoryId: null,
        quantity: 500,
        unit: "g",
        storageLocation: "REFRIGERATOR",
        price: 5.99,
      },
    ]);
    expect(r.success).toBe(true);
  });

  it("rejects an invalid storage location and negative quantity", () => {
    expect(
      reviewedItemsSchema.safeParse([
        { receiptItemId: "x", rawName: "n", include: true, productName: "n", storageLocation: "MARS" },
      ]).success
    ).toBe(false);
    expect(
      reviewedItemsSchema.safeParse([
        { receiptItemId: "x", rawName: "n", include: true, productName: "n", quantity: -5, storageLocation: "PANTRY" },
      ]).success
    ).toBe(false);
  });

  it("reads blank fields as none, so an empty category never reaches the database (PLAN 5.6)", () => {
    const r = reviewedItemsSchema.parse([
      { receiptItemId: "x", rawName: "Mini-Pak Choi 300g", include: true, productName: "Mini-Pak Choi 300g",
        ingredientName: "  ", categoryId: "", unit: "", storageLocation: "REFRIGERATOR" },
    ]);
    expect(r[0]).toMatchObject({ ingredientName: null, categoryId: null, unit: null });
  });

  it("drops a category id that isn't a UUID and keeps one that is", () => {
    const row = { receiptItemId: "x", rawName: "n", include: true, productName: "n", storageLocation: "PANTRY" };
    expect(reviewedItemsSchema.parse([{ ...row, categoryId: "not-a-uuid" }])[0].categoryId).toBeNull();
    const id = "5b0f8d2e-3c1a-4f6b-9e2d-7a1c3b5d9f01";
    expect(reviewedItemsSchema.parse([{ ...row, categoryId: id }])[0].categoryId).toBe(id);
  });
});
