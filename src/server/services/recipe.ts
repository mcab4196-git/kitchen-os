import { prisma } from "@/server/db";
import { getAIProvider } from "@/server/ai/provider";
import { validateAndFilterRecipes, type ValidatedRecipe } from "@/server/ai/recipe-schemas";
import { reconcileRecipe, scoreRecipe, normName, analyzeCookability } from "@/lib/recipe";
import { planMeals, type PlanCandidate } from "@/lib/planner";
import { convert, tidy } from "@/lib/units";
import { classifyStatus } from "@/lib/expiry";
import { getPreferences } from "./preferences";
import { resolveIngredientByText } from "./reference";

const SOON_STATUSES = new Set(["CRITICAL", "SOON", "EXPIRED"]);
const TARGET = 3;
// A saved recipe fills a slot only if it's cookable now: you have at least this
// share of its ingredients, OR it uses something that's expiring soon. Otherwise
// the AI is asked for a fresh, inventory-grounded idea instead.
const MIN_SAVED_COVERAGE = 0.5;

type IngredientList = { name: string; quantity: number | null; unit: string | null; optional: boolean }[];

interface InventoryCtx {
  tokens: string[];
  soonTokens: string[];
  available: { name: string; quantity: number; unit: string; expiresInDays: number | null }[];
}

/** Load inventory once and derive everything the pipeline needs. */
async function loadInventoryContext(userId: string): Promise<InventoryCtx> {
  const now = new Date();
  const items = await prisma.inventoryItem.findMany({
    where: { userId, isDeleted: false, quantity: { gt: 0 } },
    include: { ingredient: true },
  });

  const tokens: string[] = [];
  const soonTokens: string[] = [];
  const available = items.map((i) => {
    const name = i.ingredient?.canonicalName ?? i.productName;
    const days =
      i.expiryDate && i.expirySource !== "UNKNOWN"
        ? Math.ceil((i.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : null;
    const itemTokens = [i.productName, i.ingredient?.canonicalName].filter(Boolean) as string[];
    tokens.push(...itemTokens);
    const soon = i.expiryDate
      ? SOON_STATUSES.has(classifyStatus(i.expiryDate, i.expirySource as never, now))
      : false;
    if (soon) soonTokens.push(...itemTokens.map((t) => t.toLowerCase()));
    return { name, quantity: i.quantity, unit: i.unit, expiresInDays: days };
  });

  return { tokens, soonTokens, available };
}

function ingredientListOf(nutrition: unknown): IngredientList {
  const n = (nutrition ?? {}) as { ingredientList?: IngredientList };
  return n.ingredientList ?? [];
}

function scoreOf(ingredients: IngredientList, ctx: InventoryCtx, maxCookMinutes: number, totalMinutes: number) {
  const cook = analyzeCookability(ingredients, ctx.tokens);
  const usesExpiring = ingredients.filter((ing) => {
    const nm = ing.name.toLowerCase();
    return ctx.soonTokens.some((t) => nm.includes(t) || t.includes(nm));
  }).length;
  const withinTime = totalMinutes <= maxCookMinutes;
  const base = scoreRecipe({
    coverage: cook.weightedCoverage,
    usesExpiringCount: usesExpiring,
    missingCount: cook.missing.length,
    withinTime,
  });
  // A recipe missing its protein is a poor "cook from stock" pick — dampen it.
  const score = cook.hasRequiredProtein ? base : base * 0.4;
  return { score, coverage: cook.weightedCoverage, hasProtein: cook.hasRequiredProtein, usesExpiring };
}

/**
 * Generate the suggestion set: saved recipes first (ranked against current
 * inventory), then AI fills the remainder up to TARGET. If enough good saved
 * recipes exist, the AI isn't called at all.
 */
export async function generateSuggestions(
  userId: string
): Promise<{ ok: true; recipeIds: string[]; filtered: number; usedAI: boolean } | { ok: false; error: string }> {
  const ctx = await loadInventoryContext(userId);
  if (ctx.available.length === 0) return { ok: false, error: "Add some items to your inventory first." };
  const prefs = await getPreferences(userId);

  // 1) Rank saved recipes, but only KEEP ones that are actually cookable now:
  //    you have the required protein AND enough weighted coverage (proteins/mains
  //    count far more than staples). Others don't block a slot — the AI supplies a
  //    fresh, inventory-grounded idea instead.
  const saved = await prisma.recipe.findMany({ where: { userId, saved: true } });
  const rankedSaved = saved
    .map((r) => {
      const ings = ingredientListOf(r.nutrition);
      const total = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
      return { r, ...scoreOf(ings, ctx, prefs.maxCookMinutes, total) };
    })
    .sort((a, b) => b.score - a.score);
  const kept = rankedSaved
    .filter((x) => x.hasProtein && x.coverage >= MIN_SAVED_COVERAGE)
    .slice(0, TARGET)
    .map((x) => x.r);

  // 2) AI fills the remainder with fresh ideas.
  const newCount = TARGET - kept.length;
  let filtered = 0;
  let usedAI = false;
  const newIds: string[] = [];

  if (newCount > 0) {
    usedAI = true;
    let raw: unknown;
    try {
      const provider = await getAIProvider();
      raw = await provider.generateRecipe({
        available: ctx.available,
        preferences: {
          householdSize: prefs.householdSize,
          diet: prefs.diet,
          allergies: prefs.allergies,
          dislikes: prefs.dislikes,
          cuisines: prefs.cuisines,
          skill: prefs.skill,
          maxCookMinutes: prefs.maxCookMinutes,
        },
        count: newCount,
        exclude: kept.map((k) => k.name),
      });
    } catch (e) {
      // If we have at least one saved recipe, degrade gracefully to those.
      if (kept.length === 0) return { ok: false, error: e instanceof Error ? e.message : "Recipe generation failed." };
      raw = [];
    }

    const validated = validateAndFilterRecipes(raw, { allergies: prefs.allergies, dislikes: prefs.dislikes });
    if (validated.ok) {
      filtered = validated.filtered;
      const rankedNew = validated.recipes
        .map((r) => ({ r, m: scoreOf(r.ingredients, ctx, prefs.maxCookMinutes, (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0)) }))
        .sort((a, b) => b.m.score - a.m.score)
        .slice(0, newCount);
      for (const { r } of rankedNew) newIds.push(await persistRecipe(userId, r));
    } else if (kept.length === 0) {
      return { ok: false, error: validated.error };
    }
  }

  if (kept.length === 0 && newIds.length === 0) {
    return { ok: false, error: "No suitable recipes came back — try again or adjust your preferences." };
  }

  // 3) Stamp the current set and prune stale unsaved suggestions.
  const currentSetIds = [...kept.map((k) => k.id), ...newIds];
  const now = new Date();
  await prisma.recipe.updateMany({ where: { id: { in: currentSetIds } }, data: { lastSuggestedAt: now } });
  // Prune stale unsaved suggestions — but never one that a meal plan still points
  // at, or regenerating dinner ideas would silently gut an existing plan (SetNull).
  await prisma.recipe.deleteMany({
    where: {
      userId,
      saved: false,
      id: { notIn: currentSetIds },
      NOT: { mealPlanItems: { some: {} } },
    },
  });

  return { ok: true, recipeIds: currentSetIds, filtered, usedAI };
}

async function persistRecipe(userId: string, r: ValidatedRecipe): Promise<string> {
  const recipe = await prisma.recipe.create({
    data: {
      userId,
      name: r.name,
      description: r.description,
      prepMinutes: r.prepMinutes ? Math.round(r.prepMinutes) : null,
      cookMinutes: r.cookMinutes ? Math.round(r.cookMinutes) : null,
      difficulty: (["EASY", "MEDIUM", "HARD"].includes(r.difficulty) ? r.difficulty : "EASY") as "EASY" | "MEDIUM" | "HARD",
      servings: r.servings ? Math.round(r.servings) : 2,
      instructions: r.instructions,
      storageNotes: r.storageNotes,
      leftoverNotes: r.leftoverNotes,
      nutrition: { ingredientList: r.ingredients } as object,
      generatedBy: "ai",
    },
  });

  for (const ing of r.ingredients) {
    const resolved = await resolveIngredientByText(ing.name);
    if (resolved) {
      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: resolved.id,
          quantity: ing.quantity ?? 1,
          unit: ing.unit ?? resolved.defaultUnit,
          optional: ing.optional,
        },
      });
    }
  }
  return recipe.id;
}

/** Toggle a recipe's saved (favourite) state. */
export async function toggleSaved(userId: string, recipeId: string): Promise<boolean> {
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId } });
  if (!recipe) return false;
  const next = !recipe.saved;
  await prisma.recipe.update({ where: { id: recipeId }, data: { saved: next } });
  return next;
}

/** The current suggestion set (saved kept + AI fill), saved shown first. */
export async function listCurrentSuggestions(userId: string) {
  return prisma.recipe.findMany({
    where: { userId, lastSuggestedAt: { not: null } },
    orderBy: [{ lastSuggestedAt: "desc" }, { saved: "desc" }],
    take: TARGET,
  });
}

/** The user's saved library, optionally excluding ids already shown as suggestions. */
export async function listSaved(userId: string, excludeIds: string[] = []) {
  return prisma.recipe.findMany({
    where: { userId, saved: true, id: { notIn: excludeIds } },
    orderBy: { createdAt: "desc" },
  });
}

/** Load one recipe and reconcile its ingredients against CURRENT inventory. */
export async function getRecipeWithReconciliation(userId: string, recipeId: string) {
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId } });
  if (!recipe) return null;
  const ingredients = ingredientListOf(recipe.nutrition);

  const items = await prisma.inventoryItem.findMany({
    where: { userId, isDeleted: false, quantity: { gt: 0 } },
    include: { ingredient: true },
  });
  // Quantity-aware reconciliation: pass each item as a lot (its match tokens +
  // how much of it there is), not a bare name — so "have 2, need 4" is a shortfall.
  const lots = items.map((i) => ({
    tokens: [i.productName, i.ingredient?.canonicalName].filter(Boolean) as string[],
    quantity: i.quantity,
    unit: i.unit,
    typicalPieceGrams: i.ingredient?.typicalPieceGrams ?? null,
  }));

  return { recipe, ingredients, reconciliation: reconcileRecipe(ingredients, lots) };
}

export interface CookPlanLine {
  inventoryItemId: string;
  itemName: string;
  itemQuantity: number;
  itemUnit: string;
  ingredientName: string; // recipe ingredient this maps to
  suggestedUse: number; // in itemUnit
  convertible: boolean; // false => we couldn't convert the recipe amount; user should check
}

/**
 * Build a deduction plan for cooking a recipe: match each recipe ingredient to
 * an inventory item and suggest how much to deduct (converted into the item's
 * unit). Only matched items are deductible; the rest are "to buy".
 */
export async function buildCookPlan(userId: string, recipeId: string) {
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId } });
  if (!recipe) return null;

  const ingredients = ingredientListOf(recipe.nutrition);
  const items = await prisma.inventoryItem.findMany({
    where: { userId, isDeleted: false, quantity: { gt: 0 } },
    include: { ingredient: true },
  });

  const usedItemIds = new Set<string>();
  const lines: CookPlanLine[] = [];

  for (const ing of ingredients) {
    const target = normName(ing.name);
    if (!target) continue;
    // Find the best unused inventory item whose name/ingredient matches.
    const match = items.find((it) => {
      if (usedItemIds.has(it.id)) return false;
      const names = [it.productName, it.ingredient?.canonicalName].filter(Boolean) as string[];
      return names.some((nm) => {
        const t = normName(nm);
        return t === target || (target.length >= 3 && t.includes(target)) || (t.length >= 3 && target.includes(t));
      });
    });
    if (!match) continue;
    usedItemIds.add(match.id);

    // Suggest an amount to deduct, converting the recipe quantity into the item's unit.
    let suggested = match.quantity;
    let convertible = true;
    if (ing.quantity && ing.unit) {
      const conv = convert(ing.quantity, ing.unit, match.unit, {
        typicalPieceGrams: match.ingredient?.typicalPieceGrams ?? null,
      });
      if (conv == null) {
        convertible = false;
        suggested = 0;
      } else {
        suggested = Math.min(match.quantity, tidy(conv));
      }
    }

    lines.push({
      inventoryItemId: match.id,
      itemName: match.productName,
      itemQuantity: match.quantity,
      itemUnit: match.unit,
      ingredientName: ing.name,
      suggestedUse: suggested,
      convertible,
    });
  }

  return { recipe, lines };
}

// ─────────────────────────── Meal planner (M4) ───────────────────────────

/**
 * Build an N-day dinner plan. Gathers candidates (cookable saved recipes + a
 * fresh AI pool), runs the greedy planner (expiry-first, depletes inventory as
 * it assigns), and persists a MealPlan with one dinner per planned day.
 */
export async function generateMealPlan(
  userId: string,
  days: number
): Promise<{ ok: true; planId: string; plannedDays: number } | { ok: false; error: string }> {
  const ctx = await loadInventoryContext(userId);
  if (ctx.available.length === 0) return { ok: false, error: "Add some items to your inventory first." };
  const prefs = await getPreferences(userId);

  // Candidate pool: saved recipes + freshly generated ones.
  const saved = await prisma.recipe.findMany({ where: { userId, saved: true } });
  const savedCandidates: { id: string; ingredients: IngredientList; totalMinutes: number }[] = saved.map((r) => ({
    id: r.id,
    ingredients: ingredientListOf(r.nutrition),
    totalMinutes: (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0),
  }));

  const newIds: string[] = [];
  try {
    const provider = await getAIProvider();
    const raw = await provider.generateRecipe({
      available: ctx.available,
      preferences: {
        householdSize: prefs.householdSize,
        diet: prefs.diet,
        allergies: prefs.allergies,
        dislikes: prefs.dislikes,
        cuisines: prefs.cuisines,
        skill: prefs.skill,
        maxCookMinutes: prefs.maxCookMinutes,
      },
      count: days, // ask for enough variety for the week
      exclude: saved.map((s) => s.name),
    });
    const validated = validateAndFilterRecipes(raw, { allergies: prefs.allergies, dislikes: prefs.dislikes });
    if (validated.ok) {
      for (const r of validated.recipes) newIds.push(await persistRecipe(userId, r));
    }
  } catch {
    // Fall back to saved-only planning if the AI call fails.
  }

  const newRecipes = await prisma.recipe.findMany({ where: { id: { in: newIds } } });
  const newCandidates = newRecipes.map((r) => ({
    id: r.id,
    ingredients: ingredientListOf(r.nutrition),
    totalMinutes: (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0),
  }));

  const candidates: PlanCandidate[] = [...savedCandidates, ...newCandidates];
  if (candidates.length === 0) return { ok: false, error: "Couldn't gather any recipes to plan." };

  const orderedIds = planMeals(candidates, ctx.tokens, ctx.soonTokens, {
    days,
    maxCookMinutes: prefs.maxCookMinutes,
  });
  if (orderedIds.length === 0) {
    return { ok: false, error: "Nothing cookable from your current inventory — try scanning a receipt first." };
  }

  // Persist the plan.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const plan = await prisma.mealPlan.create({ data: { userId, startDate: start, days } });
  for (let i = 0; i < orderedIds.length; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    await prisma.mealPlanItem.create({
      data: { mealPlanId: plan.id, date, mealType: "DINNER", recipeId: orderedIds[i] },
    });
  }

  // Clean up unsaved, unplanned AI recipes to avoid clutter.
  await prisma.recipe.deleteMany({
    where: { userId, saved: false, lastSuggestedAt: null, id: { in: newIds.filter((id) => !orderedIds.includes(id)) } },
  });

  return { ok: true, planId: plan.id, plannedDays: orderedIds.length };
}

/** The user's latest meal plan with each day's recipe. */
export async function getLatestPlan(userId: string) {
  const plan = await prisma.mealPlan.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!plan) return null;
  const items = await prisma.mealPlanItem.findMany({
    where: { mealPlanId: plan.id },
    orderBy: { date: "asc" },
    include: { recipe: true },
  });
  return { plan, items };
}
