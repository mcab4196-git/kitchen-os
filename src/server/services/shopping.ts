import { prisma } from "@/server/db";
import { isUuid } from "@/lib/utils";
import { getRecipeWithReconciliation } from "./recipe";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** One default shopping list per user. */
export async function getOrCreateList(userId: string) {
  const existing = await prisma.shoppingList.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.shoppingList.create({ data: { userId, name: "Shopping list" } });
}

export async function listShopping(userId: string) {
  const list = await getOrCreateList(userId);
  const items = await prisma.shoppingListItem.findMany({
    where: { shoppingListId: list.id },
    orderBy: [{ checked: "asc" }, { reason: "asc" }],
  });
  return { list, items };
}

/** Add a manual item, skipping duplicates (same label already unchecked). */
export async function addManualItem(userId: string, label: string, quantity?: number | null, unit?: string | null) {
  const clean = label.trim();
  if (!clean) return { added: false };
  const list = await getOrCreateList(userId);

  const unchecked = await prisma.shoppingListItem.findMany({ where: { shoppingListId: list.id, checked: false } });
  if (unchecked.some((i) => norm(i.label) === norm(clean))) return { added: false };

  await prisma.shoppingListItem.create({
    data: {
      shoppingListId: list.id,
      label: clean,
      quantityNeeded: quantity ?? null,
      unit: unit ?? null,
      reason: "MANUAL",
    },
  });
  return { added: true };
}

/**
 * Put items you just ran out of back on the list, by name ("Dinner done" [5.8]).
 * The ids come from a form, so only the user's own items are read.
 */
export async function addInventoryItemsToList(userId: string, itemIds: string[]): Promise<{ added: number }> {
  const ids = itemIds.filter(isUuid);
  if (ids.length === 0) return { added: 0 };
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: ids }, userId },
    select: { productName: true },
  });
  let added = 0;
  for (const it of items) {
    if ((await addManualItem(userId, it.productName)).added) added++;
  }
  return { added };
}

/**
 * Add a recipe's missing ingredients to the list. "Missing" is quantity-aware:
 * an ingredient you have none of is added at its full recipe amount; one you're
 * merely short on is added at the shortfall (need − have). Deduped against items
 * already on the list.
 */
export async function addRecipeMissing(userId: string, recipeId: string): Promise<{ added: number; skipped: number }> {
  const data = await getRecipeWithReconciliation(userId, recipeId);
  if (!data) return { added: 0, skipped: 0 };

  const list = await getOrCreateList(userId);
  const existing = await prisma.shoppingListItem.findMany({ where: { shoppingListId: list.id } });
  const have = new Set(existing.map((i) => norm(i.label)));

  let added = 0;
  let skipped = 0;
  for (const line of data.reconciliation.lines) {
    if (line.optional || line.status === "have") continue;
    if (have.has(norm(line.name))) {
      skipped++;
      continue;
    }
    // "short" → buy the gap; "missing" → buy the full amount (or null if the
    // recipe never specified one).
    const buy = line.shortBy > 0 ? line.shortBy : line.needed ?? null;
    await prisma.shoppingListItem.create({
      data: {
        shoppingListId: list.id,
        label: line.name,
        quantityNeeded: buy,
        unit: line.unit,
        reason: "RECIPE",
      },
    });
    have.add(norm(line.name));
    added++;
  }
  return { added, skipped };
}

export async function toggleChecked(userId: string, itemId: string) {
  const list = await getOrCreateList(userId);
  const item = await prisma.shoppingListItem.findFirst({ where: { id: itemId, shoppingListId: list.id } });
  if (!item) return;
  await prisma.shoppingListItem.update({ where: { id: itemId }, data: { checked: !item.checked } });
}

export async function removeItem(userId: string, itemId: string) {
  const list = await getOrCreateList(userId);
  await prisma.shoppingListItem.deleteMany({ where: { id: itemId, shoppingListId: list.id } });
}

export async function clearChecked(userId: string) {
  const list = await getOrCreateList(userId);
  await prisma.shoppingListItem.deleteMany({ where: { shoppingListId: list.id, checked: true } });
}
