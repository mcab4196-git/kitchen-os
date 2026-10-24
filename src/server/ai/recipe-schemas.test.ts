import { describe, it, expect } from "vitest";
import { validateAndFilterRecipes } from "./recipe-schemas";

const good = {
  name: "Chicken Rice Bowl",
  ingredients: [{ name: "chicken breast" }, { name: "rice" }, { name: "soy sauce" }],
  instructions: ["Cook rice", "Fry chicken"],
};
const withPeanut = {
  name: "Peanut Noodles",
  ingredients: [{ name: "noodles" }, { name: "peanut butter" }],
  instructions: ["Mix"],
};

describe("validateAndFilterRecipes", () => {
  it("keeps safe recipes and coerces the shape", () => {
    const r = validateAndFilterRecipes([good], { allergies: [], dislikes: [] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.recipes.length).toBe(1);
      expect(r.recipes[0].difficulty).toBe("EASY"); // default applied
    }
  });

  it("hard-filters recipes containing an allergen", () => {
    const r = validateAndFilterRecipes([good, withPeanut], { allergies: ["peanuts"], dislikes: [] });
    if (r.ok) {
      expect(r.recipes.map((x) => x.name)).toEqual(["Chicken Rice Bowl"]);
      expect(r.filtered).toBe(1);
    }
  });

  it("also filters disliked foods", () => {
    const r = validateAndFilterRecipes([good], { allergies: [], dislikes: ["soy sauce"] });
    expect(r.ok && r.recipes.length).toBe(0);
  });

  it("rejects a malformed payload", () => {
    expect(validateAndFilterRecipes({ nope: true }, { allergies: [], dislikes: [] }).ok).toBe(false);
  });
});

import { recipeIsForbidden, recipeIsMalformed } from "./recipe-schemas";

describe("garbled AI output — the 8,555-character unit", () => {
  const loopUnit = "g VeraTex / pack units or g equivalent grams grams " + "g ".repeat(4000);
  const broken = {
    name: "Filipino Pork and Potato Picadillo",
    ingredients: [{ name: "Minced Pork and Beef", quantity: 300, unit: loopUnit }],
    instructions: ["Brown the meat"],
  };

  it("drops a recipe with a runaway field but keeps the rest of the batch", () => {
    const r = validateAndFilterRecipes([broken, good], { allergies: [], dislikes: [] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.recipes.map((x) => x.name)).toEqual(["Chicken Rice Bowl"]);
      expect(r.filtered).toBe(1);
    }
  });

  it("drops a short loop of repeated words, even under the length caps", () => {
    const stuck = { ...good, name: "Stuck stew", instructions: ["Stir stir stir stir stir until done"] };
    const r = validateAndFilterRecipes([stuck], { allergies: [], dislikes: [] });
    expect(r.ok && r.recipes.length).toBe(0);
  });

  it("drops a recipe with no ingredients or no steps", () => {
    const r = validateAndFilterRecipes([{ ...good, ingredients: [] }, { ...good, instructions: [] }], { allergies: [], dislikes: [] });
    expect(r.ok && r.recipes.length).toBe(0);
  });

  it('reads a unit written as the word "null" as no unit', () => {
    const r = validateAndFilterRecipes([{ ...good, ingredients: [{ name: "rice", unit: "null" }] }], { allergies: [], dislikes: [] });
    expect(r.ok && r.recipes[0].ingredients[0].unit).toBeNull();
  });

  it("flags garbled stored recipes so they're hidden, and passes normal ones", () => {
    expect(recipeIsMalformed({ name: broken.name, ingredients: broken.ingredients })).toBe(true);
    expect(recipeIsMalformed({ name: "Adobo", ingredients: [{ name: "pork", quantity: 500, unit: "g" }] })).toBe(false);
    expect(recipeIsMalformed({ name: "Adobo", ingredients: [] })).toBe(true);
  });
});

describe("recipeIsForbidden — allergen groups (N2)", () => {
  const recipe = (name: string, ...ingredients: string[]) => ({ name, ingredients: ingredients.map((n) => ({ name: n })) });
  const none = { allergies: [] as string[], dislikes: [] as string[] };

  it("an allergy to a group blocks what's in it, not just the literal word", () => {
    expect(recipeIsForbidden(recipe("Garlic pasta", "spaghetti", "butter", "garlic"), { ...none, allergies: ["dairy"] })).toBe(true);
    expect(recipeIsForbidden(recipe("Garlic pasta", "spaghetti", "olive oil", "garlic"), { ...none, allergies: ["gluten"] })).toBe(true);
    expect(recipeIsForbidden(recipe("Sinigang na hipon", "hipon", "tamarind"), { ...none, allergies: ["shellfish"] })).toBe(true);
  });

  it("checks the dish name too, in case the ingredient list leaves the allergen out", () => {
    expect(recipeIsForbidden(recipe("Kare-kare", "oxtail", "string beans"), { ...none, allergies: ["peanuts"] })).toBe(true);
  });

  it("keeps safe Filipino staples for a group allergy", () => {
    expect(recipeIsForbidden(recipe("Ginataang kalabasa", "gata", "squash"), { ...none, allergies: ["dairy"] })).toBe(false);
    expect(recipeIsForbidden(recipe("Tortang talong", "eggplant", "egg"), { ...none, allergies: ["eggs"] })).toBe(true);
    expect(recipeIsForbidden(recipe("Ensaladang talong", "eggplant", "tomato"), { ...none, allergies: ["eggs"] })).toBe(false);
  });

  it("still blocks plain words and dislikes with the loose match", () => {
    expect(recipeIsForbidden(recipe("Fruit salad", "strawberries"), { ...none, allergies: ["strawberry"] })).toBe(true);
    expect(recipeIsForbidden(recipe("Adobo", "pork", "soy sauce"), { ...none, dislikes: ["soy sauce"] })).toBe(true);
  });
});
