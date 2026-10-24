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

// AI text is untrusted in size too: a model stuck in a loop once wrote an 8,555-
// character ingredient "unit". Every field has a generous cap; a recipe that breaks
// one is dropped, never truncated into something plausible-looking.
const text = (max: number) => z.string().trim().min(1).max(max);
// Models sometimes write the word "null" (or "none") instead of leaving a field empty.
const optionalText = (max: number) =>
  z
    .preprocess((v) => (typeof v === "string" && /^\s*(null|none|n\/a)?\s*$/i.test(v) ? null : v), z.string().trim().max(max).nullable())
    .optional()
    .default(null);

export const recipeIngredientSchema = z.object({
  name: text(80),
  quantity: num.optional().default(null),
  unit: optionalText(24),
  optional: z.boolean().optional().default(false),
});

export const recipeSchema = z.object({
  name: text(120),
  description: optionalText(600),
  prepMinutes: num.optional().default(null),
  cookMinutes: num.optional().default(null),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().default("EASY"),
  servings: num.optional().default(null),
  ingredients: z.array(recipeIngredientSchema).min(1).max(40),
  instructions: z.array(text(800)).min(1).max(30),
  storageNotes: optionalText(400),
  leftoverNotes: optionalText(400),
});

export type ValidatedRecipe = z.infer<typeof recipeSchema>;

/** A generation loop shows up as one word repeated over and over ("g g g g g"). */
function repeatsItself(s: string | null | undefined): boolean {
  if (!s) return false;
  let run = 1;
  const words = s.toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = 1; i < words.length; i++) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    if (run >= 5) return true;
  }
  return false;
}

function looped(r: { name: string; description?: string | null; ingredients: { name: string; unit?: string | null }[]; instructions?: string[] }): boolean {
  return [r.name, r.description, ...r.ingredients.flatMap((i) => [i.name, i.unit]), ...(r.instructions ?? [])].some(repeatsItself);
}

/**
 * True when a stored recipe is garbled: it would fail today's checks on the name or
 * ingredients (length caps, a repeated-word loop). Used to hide recipes saved before
 * these checks existed, so they're never offered again.
 */
export function recipeIsMalformed(recipe: { name: string; ingredients: unknown[] }): boolean {
  if (!text(120).safeParse(recipe.name).success) return true;
  const ings = z.array(recipeIngredientSchema).min(1).max(40).safeParse(recipe.ingredients);
  return !ings.success || looped({ name: recipe.name, ingredients: ings.data });
}

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
 * Validate raw model output recipe by recipe: drop any that is malformed or garbled
 * (so one bad recipe can't sink the batch), then any that contains an allergen or a
 * disliked food. Returns the safe recipes plus how many were dropped.
 */
export function validateAndFilterRecipes(
  raw: unknown,
  opts: { allergies: string[]; dislikes: string[] }
): { ok: true; recipes: ValidatedRecipe[]; filtered: number } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "AI returned recipes in an unexpected shape." };

  const wellFormed: ValidatedRecipe[] = [];
  for (const item of raw) {
    const parsed = recipeSchema.safeParse(item);
    if (parsed.success && !looped(parsed.data)) wellFormed.push(parsed.data);
  }
  const safe = wellFormed.filter((r) => !recipeIsForbidden(r, opts));
  return { ok: true, recipes: safe, filtered: raw.length - safe.length };
}
