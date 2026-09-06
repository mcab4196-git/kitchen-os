// Recipe grounding + scoring — pure, unit-tested.
//
// The model only *proposes* recipes. Whether you actually have an ingredient is
// decided HERE, in code, by matching recipe ingredients against your real
// inventory (§17 — never trust the model's "you have this"). Scoring then ranks
// candidates, favouring recipes that use soon-to-expire items (§11).

import { convert, tidy } from "./units";

export interface RecipeIngredientLite {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
}

/**
 * One inventory item as far as reconciliation cares: the names it can be matched
 * by, and how much of it there is. Pass these (instead of bare name strings) to
 * get a quantity-aware split — "have 2, need 4" becomes a shortfall, not a tick.
 */
export interface InventoryLot {
  tokens: string[]; // productName + canonical name (+ aliases)
  quantity?: number | null;
  unit?: string | null;
  typicalPieceGrams?: number | null; // enables count <-> mass conversion
}

export type InventoryInput = string[] | InventoryLot[];

/** Per-ingredient verdict, quantity-aware where the numbers allow it. */
export interface ReconcileLine {
  name: string;
  optional: boolean;
  needed: number | null; // recipe quantity as written
  unit: string | null;
  have: number | null; // inventory qty expressed in `unit`; null = present but not comparable
  shortBy: number; // how much to buy: max(0, needed - have), or the full amount when absent
  status: "have" | "short" | "missing";
}

export interface ReconcileResult {
  available: string[]; // lines with status "have"
  missing: string[]; // required lines short of, or absent from, inventory
  lines: ReconcileLine[]; // the full per-ingredient breakdown
  coverage: number; // available / (available + missing), 0..1
}

/** Normalize a name for loose matching. */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(fresh|large|small|medium|whole|ground|boneless|skinless)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Things everyone has — never counted as "to buy". Scoped to water on purpose
// (you can genuinely run out of salt, but not tap water).
const ALWAYS_AVAILABLE = new Set([
  "water",
  "tap water",
  "cold water",
  "warm water",
  "hot water",
  "boiling water",
  "filtered water",
  "lukewarm water",
  "room temperature water",
  "ice",
]);

export function isAlwaysAvailable(name: string): boolean {
  return ALWAYS_AVAILABLE.has(normName(name));
}

/** Loose name match between one recipe ingredient and one inventory token. */
function nameMatchesToken(ingredientName: string, rawToken: string): boolean {
  const n = normName(ingredientName);
  const t = normName(rawToken);
  if (!n || !t) return false;
  if (t === n) return true;
  if (n.length >= 3 && t.includes(n)) return true;
  if (t.length >= 3 && n.includes(t)) return true;
  return false;
}

function matches(ingredientName: string, inventoryTokens: string[]): boolean {
  if (isAlwaysAvailable(ingredientName)) return true;
  if (!normName(ingredientName)) return false;
  return inventoryTokens.some((raw) => nameMatchesToken(ingredientName, raw));
}

/** Accept either bare name strings (name-only match) or full lots (quantity-aware). */
function toLots(inventory: InventoryInput): InventoryLot[] {
  if (inventory.length === 0) return [];
  if (typeof inventory[0] === "string") {
    return (inventory as string[]).map((t) => ({ tokens: [t] }));
  }
  return inventory as InventoryLot[];
}

/**
 * Split a recipe's ingredients into what you already have vs need to buy.
 *
 * Names are matched against inventory tokens (product names, canonical names,
 * aliases). When BOTH the recipe line and the matched lot(s) carry a quantity +
 * a convertible unit, the amounts are compared: having *some* of an ingredient
 * but not *enough* is a "short" line (it goes to `missing`, and `shortBy` is the
 * amount to buy). When the quantities can't be compared (no recipe amount, or an
 * unconvertible unit) we fall back to name-presence and don't guess. Optional
 * ingredients you lack are never counted as missing.
 */
export function reconcileRecipe(
  ingredients: RecipeIngredientLite[],
  inventory: InventoryInput
): ReconcileResult {
  const lots = toLots(inventory);

  const lines: ReconcileLine[] = ingredients.map((ing) => {
    const optional = !!ing.optional;
    const needed = ing.quantity ?? null;
    const unit = ing.unit ?? null;
    const base = { name: ing.name, optional, needed, unit };

    if (isAlwaysAvailable(ing.name)) {
      return { ...base, have: needed, shortBy: 0, status: "have" as const };
    }

    const matched = lots.filter((lot) => lot.tokens.some((tok) => nameMatchesToken(ing.name, tok)));
    if (matched.length === 0) {
      return { ...base, have: 0, shortBy: needed ?? 0, status: "missing" as const };
    }

    // Name is present. Compare amounts only when the recipe gave us a quantity
    // AND at least one matched lot converts into the recipe's unit.
    if (needed == null || unit == null) {
      return { ...base, have: null, shortBy: 0, status: "have" as const };
    }
    let sum = 0;
    let comparable = false;
    for (const lot of matched) {
      if (lot.quantity == null || !lot.unit) continue;
      const inRecipeUnit = convert(lot.quantity, lot.unit, unit, {
        typicalPieceGrams: lot.typicalPieceGrams ?? null,
      });
      if (inRecipeUnit == null) continue;
      sum += inRecipeUnit;
      comparable = true;
    }
    if (!comparable) {
      return { ...base, have: null, shortBy: 0, status: "have" as const };
    }

    const have = tidy(sum);
    if (have + 1e-6 >= needed) {
      return { ...base, have, shortBy: 0, status: "have" as const };
    }
    return { ...base, have, shortBy: tidy(needed - have), status: "short" as const };
  });

  const available = lines.filter((l) => l.status === "have").map((l) => l.name);
  const missing = lines.filter((l) => l.status !== "have" && !l.optional).map((l) => l.name);
  const denom = available.length + missing.length || 1;
  return { available, missing, lines, coverage: available.length / denom };
}

// ─── Ingredient tiers: proteins and mains matter far more than staples ───

export type IngredientTier = "protein" | "main" | "staple";

// Checked in order: staple overrides (so "chicken stock" is a staple, not a
// protein), then proteins, else it's a substantial "main".
const STAPLE_KEYWORDS = [
  "oil", "salt", "pepper", "peppercorn", "vinegar", "sugar", "honey", "syrup",
  "sauce", "stock", "broth", "bouillon", "paste", "powder", "flour", "cornstarch",
  "cornflour", "starch", "baking", "yeast", "water", "garlic", "ginger", "chili",
  "chilli", "cumin", "paprika", "oregano", "basil", "thyme", "rosemary", "bay",
  "cinnamon", "nutmeg", "cayenne", "turmeric", "coriander", "cilantro", "parsley",
  "dill", "sesame", "vanilla", "mustard", "ketchup", "mayonnaise", "spice", "herb",
  "seasoning", "extract", "zest",
];
const PROTEIN_KEYWORDS = [
  "meat", "pork", "beef", "chicken", "poultry", "turkey", "lamb", "veal", "bacon",
  "ham", "sausage", "mince", "fish", "salmon", "tuna", "cod", "haddock", "shrimp",
  "prawn", "crab", "squid", "tofu", "tempeh", "seitan", "egg", "lentil", "chickpea",
  "bean", "liempo",
];

function hasKeyword(name: string, keywords: string[]): boolean {
  const n = normName(name);
  return keywords.some((k) => n === k || n.includes(k));
}

export function tierOf(name: string): IngredientTier {
  if (hasKeyword(name, STAPLE_KEYWORDS)) return "staple";
  if (hasKeyword(name, PROTEIN_KEYWORDS)) return "protein";
  return "main";
}

const TIER_WEIGHT: Record<IngredientTier, number> = { protein: 4, main: 2, staple: 0.5 };

export interface Cookability {
  weightedCoverage: number; // 0..1, weighted toward proteins/mains
  hasRequiredProtein: boolean; // recipe needs no protein, OR you have one it needs
  available: string[];
  missing: string[];
}

/**
 * Weighted view of whether you can actually cook a recipe from stock. Missing a
 * staple (salt, oil) barely matters; missing the protein matters a lot. If a
 * recipe calls for any (non-optional) protein and you have none, it's not cookable.
 */
export function analyzeCookability(ingredients: RecipeIngredientLite[], inventoryTokens: string[]): Cookability {
  let weightedTotal = 0;
  let weightedAvailable = 0;
  const available: string[] = [];
  const missing: string[] = [];
  const requiredProteins: boolean[] = [];

  for (const ing of ingredients) {
    const have = matches(ing.name, inventoryTokens);
    const tier = tierOf(ing.name);
    if (tier === "protein" && !ing.optional) requiredProteins.push(have);

    if (have) available.push(ing.name);
    else if (!ing.optional) missing.push(ing.name);

    // Optional-and-absent doesn't count against you.
    if (ing.optional && !have) continue;
    weightedTotal += TIER_WEIGHT[tier];
    if (have) weightedAvailable += TIER_WEIGHT[tier];
  }

  const hasRequiredProtein = requiredProteins.length === 0 || requiredProteins.some(Boolean);

  return {
    weightedCoverage: weightedTotal === 0 ? 0 : weightedAvailable / weightedTotal,
    hasRequiredProtein,
    available,
    missing,
  };
}

export interface ScoreInput {
  coverage: number; // 0..1
  usesExpiringCount: number; // # of soon-to-expire items this recipe uses
  missingCount: number;
  withinTime: boolean; // fits the user's max cook time
}

export interface ScoreWeights {
  coverage: number;
  expiry: number;
  time: number;
  missing: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = { coverage: 0.4, expiry: 0.35, time: 0.1, missing: 0.15 };

/**
 * Rank score for a candidate recipe. Higher is better. Expiry usage is the
 * differentiator; missing ingredients are a penalty. Weights are configurable.
 */
export function scoreRecipe(input: ScoreInput, weights: ScoreWeights = DEFAULT_WEIGHTS): number {
  const expiryScore = Math.min(1, input.usesExpiringCount / 3); // saturates at 3
  const missingPenalty = Math.min(1, input.missingCount / 4);
  const timeScore = input.withinTime ? 1 : 0;
  const raw =
    weights.coverage * input.coverage +
    weights.expiry * expiryScore +
    weights.time * timeScore -
    weights.missing * missingPenalty;
  return Math.round(Math.max(0, raw) * 1000) / 1000;
}
