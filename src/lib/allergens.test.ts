import { describe, it, expect } from "vitest";
import { allergenGroupsFor, containsAllergen, describeAllergy, EU_ALLERGEN_GROUPS } from "./allergens";

const group = (key: string) => EU_ALLERGEN_GROUPS.find((g) => g.key === key)!;
const blocks = (key: string, food: string) => containsAllergen(food, group(key));

describe("allergenGroupsFor — what a typed allergy stands for (N2)", () => {
  it("covers all 14 EU groups", () => {
    expect(EU_ALLERGEN_GROUPS.map((g) => g.key)).toHaveLength(14);
  });

  it("maps everyday words to their group, ignoring case and plurals", () => {
    expect(allergenGroupsFor("Dairy").map((g) => g.key)).toEqual(["milk"]);
    expect(allergenGroupsFor("eggs").map((g) => g.key)).toEqual(["eggs"]);
    expect(allergenGroupsFor("Tree nuts").map((g) => g.key)).toEqual(["nuts"]);
    expect(allergenGroupsFor("gatas").map((g) => g.key)).toEqual(["milk"]);
  });

  it("maps shellfish to both crustaceans and molluscs", () => {
    expect(allergenGroupsFor("shellfish").map((g) => g.key).sort()).toEqual(["crustaceans", "molluscs"]);
  });

  it("leaves a specific food as a plain word", () => {
    expect(allergenGroupsFor("strawberries")).toEqual([]);
    expect(allergenGroupsFor("")).toEqual([]);
  });
});

describe("containsAllergen — the gaps REVIEW N2 found", () => {
  it("dairy blocks butter, cheese, cream and Filipino names", () => {
    for (const food of ["unsalted butter", "cheddar cheese", "all purpose cream", "evaporated milk", "kesong puti", "gatas", "leche flan"]) {
      expect(blocks("milk", food)).toBe(true);
    }
  });

  it("dairy does not block coconut milk, gata or peanut butter", () => {
    for (const food of ["coconut milk", "kakang gata", "coconut cream", "peanut butter", "cream of tartar"]) {
      expect(blocks("milk", food)).toBe(false);
    }
  });

  it("gluten blocks flour, pasta and soy sauce, but not rice flour or rice noodles", () => {
    for (const food of ["all-purpose flour", "spaghetti", "soy sauce", "miki noodles", "breadcrumbs", "lumpia wrapper"]) {
      expect(blocks("gluten", food)).toBe(true);
    }
    for (const food of ["rice flour", "glutinous rice flour", "rice noodles", "bihon noodles", "cornstarch"]) {
      expect(blocks("gluten", food)).toBe(false);
    }
  });

  it("eggs block egg dishes but not eggplant", () => {
    expect(blocks("eggs", "2 eggs, beaten")).toBe(true);
    expect(blocks("eggs", "mayonnaise")).toBe(true);
    expect(blocks("eggs", "Tortang talong")).toBe(true);
    expect(blocks("eggs", "eggplant")).toBe(false);
  });

  it("tree nuts block nuts and pesto, but not coconut, nutmeg or butternut", () => {
    for (const food of ["almonds", "cashew nuts", "pili nuts", "basil pesto"]) expect(blocks("nuts", food)).toBe(true);
    for (const food of ["coconut", "nutmeg", "butternut squash", "water chestnut"]) expect(blocks("nuts", food)).toBe(false);
  });

  it("covers peanuts, fish, crustaceans and molluscs by English and Filipino names", () => {
    expect(blocks("peanuts", "Kare-kare")).toBe(true);
    expect(blocks("fish", "patis")).toBe(true);
    expect(blocks("fish", "Worcestershire sauce")).toBe(true);
    expect(blocks("crustaceans", "hipon")).toBe(true);
    expect(blocks("crustaceans", "bagoong alamang")).toBe(true);
    expect(blocks("molluscs", "oyster sauce")).toBe(true);
    expect(blocks("molluscs", "oyster mushrooms")).toBe(false);
  });

  it("covers soy, sesame, celery, mustard, sulphites and lupin", () => {
    expect(blocks("soy", "tokwa")).toBe(true);
    expect(blocks("sesame", "tahini")).toBe(true);
    expect(blocks("celery", "celery stalks")).toBe(true);
    expect(blocks("mustard", "Dijon")).toBe(true);
    expect(blocks("sulphites", "white wine")).toBe(true);
    expect(blocks("lupin", "lupin flour")).toBe(true);
  });
});

describe("describeAllergy — clearer instructions for the AI", () => {
  it("spells out a group, and leaves a plain word alone", () => {
    expect(describeAllergy("dairy")).toMatch(/^dairy \(milk, gatas, leche, butter, mantikilya, and anything made from them\)$/);
    expect(describeAllergy("strawberries")).toBe("strawberries");
  });
});
