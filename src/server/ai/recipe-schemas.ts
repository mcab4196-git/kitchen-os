// Validation + safety filtering for AI-generated recipes.
//
// Allergies and dislikes are applied here as a HARD FILTER in code — a recipe
// that names an allergen is dropped even if the model was told to avoid it.
// We never trade off safety against convenience. Pure (testable).

import { z } from "zod";
import { normName } from "@/lib/recipe";
import { allergenGroupsFor, containsAllergen } from "@/lib/allergens";

const num = z.preprocess((v) => {
  if (v === "" || v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n as number) ? n : null;
}, z.number().nullable());

export const recipeIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: num.optional().default(null),
  unit: z.string().nullable().optional().default(null),
  optional: z.boolean().optional().default(false),
});

export const recipeSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional().default(null),
  prepMinutes: num.optional().default(null),
  cookMinutes: num.optional().default(null),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().default("EASY"),
  servings: num.optional().default(null),
  ingredients: z.array(recipeIngredientSchema).default([]),
  instructions: z.array(z.string()).default([]),
  storageNotes: z.string().nullable().optional().default(null),
  leftoverNotes: z.string().nullable().optional().default(null),
});

export const recipesSchema = z.array(recipeSchema);
export type ValidatedRecipe = z.infer<typeof recipeSchema>;

function stem(w: string): string {
  // "-ies" → "-y", so an allergy to "strawberry" also catches "strawberries".
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}
function toTokens(s: string): string[] {
  return normName(s).split(" ").map(stem).filter(Boolean);
}

/** True if any ingredient contains a forbidden term (token/stem/substring aware). */
function containsForbidden(ingredients: { name: string }[], forbidden: string[]): boolean {
  const forbiddenSets = forbidden.map(toTokens).filter((a) => a.length > 0);
  if (forbiddenSets.length === 0) return false;
  return ingredients.some((ing) => {
    const ingTokens = toTokens(ing.name);
    // A forbidden term matches when every one of its tokens is present in the
    // ingredient as an equal or substring token. Errs toward exclusion (safe).
    return forbiddenSets.some((fts) =>
      fts.every((t) => ingTokens.some((it) => it === t || it.includes(t) || t.includes(it)))
    );
  });
}

/**
 * The hard filter, for any recipe: AI output, saved favourites and older
 * suggestions alike. An allergy that names an EU-14 group ("dairy", "gluten",
 * "shellfish") blocks everything in the group (N2), matched on whole words in each
 * ingredient and in the dish name, so "egg" still allows eggplant. Any other
 * allergy, and every dislike, uses the loose literal match above.
 */
export function recipeIsForbidden(
  recipe: { name: string; ingredients: { name: string }[] },
  opts: { allergies: string[]; dislikes: string[] }
): boolean {
  const groups = opts.allergies.flatMap(allergenGroupsFor);
  const literal = [...opts.allergies.filter((a) => allergenGroupsFor(a).length === 0), ...opts.dislikes];
  if (containsForbidden(recipe.ingredients, literal)) return true;
  return groups.some(
    (g) => containsAllergen(recipe.name, g) || recipe.ingredients.some((ing) => containsAllergen(ing.name, g))
  );
}

/**
 * Validate raw model output and drop any recipe that contains an allergen or a
 * disliked food. Returns the safe recipes plus how many were filtered out.
 */
export function validateAndFilterRecipes(
  raw: unknown,
  opts: { allergies: string[]; dislikes: string[] }
): { ok: true; recipes: ValidatedRecipe[]; filtered: number } | { ok: false; error: string } {
  const parsed = recipesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "AI returned recipes in an unexpected shape." };

  const safe = parsed.data.filter((r) => !recipeIsForbidden(r, opts));
  return { ok: true, recipes: safe, filtered: parsed.data.length - safe.length };
}
