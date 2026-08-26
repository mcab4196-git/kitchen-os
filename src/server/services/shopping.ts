import { prisma } from "@/server/db";
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
 * Add a recipe's missing ingredients to the list. Missing = not in inventory
 * (computed by reconciliation). Also deduped against items already on the list.
 */
export async function addRecipeMissing(userId: string, recipeId: string): Promise<{ added: number; skipped: number }> {
  const data = await getRecipeWithReconciliation(userId, recipeId);
  if (!data) return { added: 0, skipped: 0 };

  const list = await getOrCreateList(userId);
  const existing = await prisma.shoppingListItem.findMany({ where: { shoppingListId: list.id } });
  const have = new Set(existing.map((i) => norm(i.label)));

  let added = 0;
  let skipped = 0;
  for (const name of data.reconciliation.missing) {
    if (have.has(norm(name))) {
      skipped++;
      continue;
    }
    const detail = data.ingredients.find((ing) => norm(ing.name) === norm(name));
    await prisma.shoppingListItem.create({
      data: {
        shoppingListId: list.id,
        label: name,
        quantityNeeded: detail?.quantity ?? null,
        unit: detail?.unit ?? null,
        reason: "RECIPE",
      },
    });
    have.add(norm(name));
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
