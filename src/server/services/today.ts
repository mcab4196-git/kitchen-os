import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { classifyStatus, type ExpirySource, type ExpiryStatus } from "@/lib/expiry";
import { lotsUsedBy, pickTonight, reconcileRecipe } from "@/lib/recipe";
import { ingredientListOf, listCurrentSuggestions, listSaved } from "./recipe";

// Today and tomorrow outrank the rest of the 3-day window when picking tonight's dinner (§11).
const URGENCY: Partial<Record<ExpiryStatus, number>> = { CRITICAL: 2, SOON: 1 };
// Saved favourites weighed alongside current suggestions; bounded so a big library can't slow the page.
const SAVED_LIMIT = 30;

export type TodayItem = Prisma.InventoryItemGetPayload<{ include: { ingredient: true } }> & {
  status: ExpiryStatus;
};

/**
 * Everything the Today home [5.8] shows, from one inventory read: the counts, what
 * needs using, and tonight's dinner. Every query is scoped by userId.
 */
export async function getToday(userId: string, now: Date = new Date()) {
  const rows = await prisma.inventoryItem.findMany({
    where: { userId, isDeleted: false, quantity: { gt: 0 } },
    include: { ingredient: true },
    orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
  const items: TodayItem[] = rows.map((i) => ({
    ...i,
    status: classifyStatus(i.expiryDate, i.expirySource as ExpirySource, now),
  }));

  const expiring = items.filter((i) => URGENCY[i.status]);
  return {
    total: items.length,
    expiring,
    expired: items.filter((i) => i.status === "EXPIRED"),
    noDate: items.filter((i) => i.status === "UNKNOWN"),
    tonight: expiring.length > 0 ? await chooseTonight(userId, items) : null,
  };
}

/**
 * Tonight's dinner, chosen only from ideas that already exist (current suggestions
 * and saved favourites), so a page load never spends an AI call. Null when none of
 * them uses anything that needs using; Today then points to "What's for dinner?".
 */
async function chooseTonight(userId: string, items: TodayItem[]) {
  const suggestions = await listCurrentSuggestions(userId);
  const saved = (await listSaved(userId, suggestions.map((s) => s.id))).slice(0, SAVED_LIMIT);

  // The same lots the recipe page reconciles against, so Today and the recipe agree.
  const lots = items.map((item) => ({
    tokens: [item.productName, item.ingredient?.canonicalName].filter(Boolean) as string[],
    quantity: item.quantity,
    unit: item.unit,
    typicalPieceGrams: item.ingredient?.typicalPieceGrams ?? null,
    item,
  }));
  const expiringLots = lots.filter((l) => URGENCY[l.item.status]);

  const pick = pickTonight(
    [...suggestions, ...saved].map((recipe) => {
      const ingredients = ingredientListOf(recipe.nutrition);
      const uses = lotsUsedBy(ingredients, expiringLots).map((l) => l.item);
      const { lines, missing } = reconcileRecipe(ingredients, lots);
      return {
        recipe,
        uses,
        lines,
        saved: recipe.saved,
        missing: missing.length,
        urgency: uses.reduce((sum, i) => sum + (URGENCY[i.status] ?? 0), 0),
      };
    })
  );
  if (!pick) return null;

  return {
    recipe: pick.recipe,
    uses: pick.uses,
    short: pick.lines.filter((l) => l.status === "short" && !l.optional),
    missing: pick.lines.filter((l) => l.status === "missing" && !l.optional),
  };
}
