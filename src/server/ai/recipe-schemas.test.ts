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
