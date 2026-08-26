// Meal planner — pure, unit-tested.
//
// Greedy over days (per the architecture analysis): each day picks the highest-
// scoring cookable recipe given the inventory that REMAINS after earlier days,
// so meals don't all fight over the same chicken, and soon-to-expire items get
// used early. No repeats within a plan.

import { analyzeCookability, scoreRecipe, normName, type RecipeIngredientLite } from "./recipe";

export interface PlanCandidate {
  id: string;
  ingredients: RecipeIngredientLite[];
  totalMinutes: number;
}

function tokenMatchesName(token: string, name: string): boolean {
  const t = normName(token);
  const n = normName(name);
  if (!t || !n) return false;
  return t === n || (n.length >= 3 && t.includes(n)) || (t.length >= 3 && n.includes(t));
}

export interface PlanOptions {
  days: number;
  maxCookMinutes: number;
  minCoverage?: number; // a recipe must reach this weighted coverage to be planned
}

/**
 * Returns an ordered list of recipe ids, one per day (may be shorter than
 * `days` if the pool runs out of cookable options).
 */
export function planMeals(
  candidates: PlanCandidate[],
  inventoryTokens: string[],
  soonTokens: string[],
  opts: PlanOptions
): string[] {
  const minCoverage = opts.minCoverage ?? 0.4;
  const soon = soonTokens.map(normName).filter(Boolean);
  let effective = [...inventoryTokens];
  const pool = [...candidates];
  const plan: string[] = [];

  for (let day = 0; day < opts.days; day++) {
    let best: PlanCandidate | null = null;
    let bestScore = -1;

    for (const c of pool) {
      const cook = analyzeCookability(c.ingredients, effective);
      if (!cook.hasRequiredProtein || cook.weightedCoverage < minCoverage) continue;

      const usesExpiring = c.ingredients.filter((ing) => {
        const nm = normName(ing.name);
        const stillHave = effective.some((t) => tokenMatchesName(t, ing.name));
        return stillHave && soon.some((s) => nm.includes(s) || s.includes(nm));
      }).length;

      const score = scoreRecipe({
        coverage: cook.weightedCoverage,
        usesExpiringCount: usesExpiring,
        missingCount: cook.missing.length,
        withinTime: c.totalMinutes <= opts.maxCookMinutes,
      });
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }

    if (!best) break; // nothing else cookable from what's left
    plan.push(best.id);
    pool.splice(pool.indexOf(best), 1);

    // Deplete: the ingredients this recipe used are no longer available.
    for (const ing of best.ingredients) {
      effective = effective.filter((t) => !tokenMatchesName(t, ing.name));
    }
  }

  return plan;
}
