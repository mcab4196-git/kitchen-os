import { describe, it, expect } from "vitest";
import { reconcileRecipe, scoreRecipe, normName } from "./recipe";

const inventory = ["chicken breast", "Garlic Cloves", "onion", "rice", "spinach"];

describe("reconcileRecipe", () => {
  it("splits available vs missing against inventory", () => {
    const r = reconcileRecipe(
      [
        { name: "chicken breast", quantity: 300, unit: "g" },
        { name: "garlic", quantity: 2, unit: "clove" }, // matches "Garlic Cloves"
        { name: "rice", quantity: 200, unit: "g" },
        { name: "soy sauce", quantity: 2, unit: "tbsp" }, // not in inventory
      ],
      inventory
    );
    expect(r.available.sort()).toEqual(["chicken breast", "garlic", "rice"]);
    expect(r.missing).toEqual(["soy sauce"]);
    expect(r.coverage).toBeCloseTo(0.75, 2);
  });

  it("does not count optional missing ingredients as missing", () => {
    const r = reconcileRecipe(
      [
        { name: "onion" },
        { name: "parsley", optional: true }, // missing but optional
      ],
      inventory
    );
    expect(r.missing).toEqual([]);
    expect(r.available).toEqual(["onion"]);
    expect(r.coverage).toBe(1);
  });

  it("normName strips descriptors so 'fresh spinach' matches 'spinach'", () => {
    expect(normName("Fresh Spinach")).toBe("spinach");
    const r = reconcileRecipe([{ name: "fresh spinach" }], inventory);
    expect(r.available).toEqual(["fresh spinach"]);
  });
});

describe("scoreRecipe", () => {
  it("rewards coverage and expiry usage, penalizes missing", () => {
    const usesExpiring = scoreRecipe({ coverage: 1, usesExpiringCount: 3, missingCount: 0, withinTime: true });
    const nothingSpecial = scoreRecipe({ coverage: 0.5, usesExpiringCount: 0, missingCount: 3, withinTime: false });
    expect(usesExpiring).toBeGreaterThan(nothingSpecial);
  });

  it("a recipe using expiring items outranks an equal one that doesn't", () => {
    const base = { coverage: 0.8, missingCount: 1, withinTime: true };
    const withExpiry = scoreRecipe({ ...base, usesExpiringCount: 2 });
    const withoutExpiry = scoreRecipe({ ...base, usesExpiringCount: 0 });
    expect(withExpiry).toBeGreaterThan(withoutExpiry);
  });

  it("never returns a negative score", () => {
    expect(scoreRecipe({ coverage: 0, usesExpiringCount: 0, missingCount: 10, withinTime: false })).toBeGreaterThanOrEqual(0);
  });
});

import { tierOf, analyzeCookability } from "./recipe";

describe("tierOf", () => {
  it("classifies proteins, mains, and staples", () => {
    expect(tierOf("Pork Liempo")).toBe("protein");
    expect(tierOf("chicken breast")).toBe("protein");
    expect(tierOf("jasmine rice")).toBe("main");
    expect(tierOf("potatoes")).toBe("main");
    expect(tierOf("canola oil")).toBe("staple");
    expect(tierOf("white vinegar")).toBe("staple");
    expect(tierOf("whole black peppercorns")).toBe("staple");
    expect(tierOf("garlic")).toBe("staple");
    expect(tierOf("chicken stock")).toBe("staple"); // staple overrides protein
  });
});

describe("analyzeCookability — the adobo case", () => {
  // Have condiments/staples + rice + potatoes, but NOT the pork.
  const haveTokens = ["jasmine rice", "potatoes", "garlic", "canola oil"];
  const adobo = [
    { name: "Pork Liempo", quantity: 500, unit: "g" },
    { name: "Potatoes", quantity: 250, unit: "g" },
    { name: "garlic", quantity: 5, unit: "clove" },
    { name: "Canola Oil", quantity: 1, unit: "tbsp" },
    { name: "White Vinegar", quantity: 0.25, unit: "cup" },
    { name: "Salt", quantity: 1, unit: "tsp" },
    { name: "Whole Black Peppercorns", quantity: 1, unit: "tsp" },
    { name: "Rice", quantity: 200, unit: "g" },
    { name: "Dried Bay Leaves", quantity: 2, unit: "pcs", optional: true },
  ];

  it("flags the missing protein and yields low weighted coverage", () => {
    const c = analyzeCookability(adobo, haveTokens);
    expect(c.hasRequiredProtein).toBe(false); // pork is missing
    expect(c.weightedCoverage).toBeLessThan(0.5);
  });

  it("becomes cookable once you have the pork", () => {
    const c = analyzeCookability(adobo, [...haveTokens, "pork liempo"]);
    expect(c.hasRequiredProtein).toBe(true);
    expect(c.weightedCoverage).toBeGreaterThan(0.6);
  });

  it("a recipe with no protein doesn't require one", () => {
    const salad = [
      { name: "spinach", quantity: 100, unit: "g" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ];
    const c = analyzeCookability(salad, ["spinach"]);
    expect(c.hasRequiredProtein).toBe(true);
  });

  it("missing only a staple stays highly cookable", () => {
    const dish = [
      { name: "chicken breast", quantity: 300, unit: "g" },
      { name: "rice", quantity: 200, unit: "g" },
      { name: "salt", quantity: 1, unit: "tsp" }, // missing
    ];
    const c = analyzeCookability(dish, ["chicken breast", "rice"]);
    expect(c.hasRequiredProtein).toBe(true);
    expect(c.weightedCoverage).toBeGreaterThan(0.9);
  });
});

import { isAlwaysAvailable } from "./recipe";

describe("water is always available", () => {
  it("water variants never count as missing", () => {
    expect(isAlwaysAvailable("Water")).toBe(true);
    expect(isAlwaysAvailable("warm water")).toBe(true);
    const r = reconcileRecipe(
      [{ name: "Water", quantity: 100, unit: "ml" }, { name: "soy sauce" }],
      ["chicken breast"]
    );
    expect(r.available).toContain("Water");
    expect(r.missing).toEqual(["soy sauce"]);
  });
  it("does not falsely match watercress or coconut water", () => {
    expect(isAlwaysAvailable("watercress")).toBe(false);
    expect(isAlwaysAvailable("coconut water")).toBe(false);
  });
});
