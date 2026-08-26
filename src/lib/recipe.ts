// Recipe grounding + scoring — pure, unit-tested.
//
// The model only *proposes* recipes. Whether you actually have an ingredient is
// decided HERE, in code, by matching recipe ingredients against your real
// inventory (§17 — never trust the model's "you have this"). Scoring then ranks
// candidates, favouring recipes that use soon-to-expire items (§11).

export interface RecipeIngredientLite {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
}

export interface ReconcileResult {
  available: string[];
  missing: string[]; // required ingredients not in inventory
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

function matches(ingredientName: string, inventoryTokens: string[]): boolean {
  if (isAlwaysAvailable(ingredientName)) return true;
  const n = normName(ingredientName);
  if (!n) return false;
  return inventoryTokens.some((raw) => {
    const t = normName(raw);
    if (!t) return false;
    if (t === n) return true;
    if (n.length >= 3 && t.includes(n)) return true;
    if (t.length >= 3 && n.includes(t)) return true;
    return false;
  });
}

/**
 * Split a recipe's ingredients into what you already have vs need to buy, by
 * matching names against inventory tokens (canonical names, product names,
 * aliases). Optional ingredients you lack are not counted as "missing".
 */
export function reconcileRecipe(
  ingredients: RecipeIngredientLite[],
  inventoryTokens: string[]
): ReconcileResult {
  const available: string[] = [];
  const missing: string[] = [];
  for (const ing of ingredients) {
    if (matches(ing.name, inventoryTokens)) available.push(ing.name);
    else if (!ing.optional) missing.push(ing.name);
  }
  const denom = available.length + missing.length || 1;
  return { available, missing, coverage: available.length / denom };
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
