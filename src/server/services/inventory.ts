import { prisma } from "@/server/db";
import type { StorageLocation, ExpirySource, Prisma } from "@prisma/client";
import { classifyStatus, estimateExpiry, type ShelfLifeRuleish } from "@/lib/expiry";
import { computeDeduction } from "@/lib/deduct";
import { isUuid } from "@/lib/utils";
import { resolveIngredientByText } from "./reference";

export interface CreateItemInput {
  productName: string;
  ingredientName?: string | null;
  ingredientId?: string | null;
  categoryId?: string | null;
  quantity: number;
  unit: string;
  storageLocation: StorageLocation;
  purchaseDate: Date;
  opened: boolean;
  openedAt?: Date | null;
  exactExpiryDate?: Date | null;
  price?: number | null;
  currency?: string | null;
  store?: string | null;
  notes?: string | null;
  source?: "MANUAL" | "RECEIPT" | "LEFTOVER";
  receiptId?: string | null;
}

type ResolvedIngredient = Awaited<ReturnType<typeof resolveIngredientByText>>;

/** Resolve an ingredient by explicit id or free-text name (alias match). */
async function resolveIngredient(
  ingredientId?: string | null,
  ingredientName?: string | null
): Promise<ResolvedIngredient> {
  if (ingredientId) {
    return prisma.ingredient.findUnique({ where: { id: ingredientId }, include: { category: true } });
  }
  if (ingredientName) return resolveIngredientByText(ingredientName);
  return null;
}

/**
 * Decide an item's expiry honestly:
 *   exact date supplied -> EXACT; rule matches -> ESTIMATED; else UNKNOWN.
 * Shared by create and update so the logic never drifts.
 */
async function decideExpiry(args: {
  exactExpiryDate?: Date | null;
  ingredient: ResolvedIngredient;
  categoryName: string | null;
  purchaseDate: Date;
  storage: StorageLocation;
  opened: boolean;
  openedAt?: Date | null;
}): Promise<{ expiryDate: Date | null; expirySource: ExpirySource; expiryConfidence: number | null }> {
  if (args.exactExpiryDate) {
    return { expiryDate: args.exactExpiryDate, expirySource: "EXACT", expiryConfidence: 1 };
  }
  if (!args.ingredient?.id && !args.categoryName) {
    return { expiryDate: null, expirySource: "UNKNOWN", expiryConfidence: null };
  }

  const orClauses: Array<{ ingredientId: string } | { categoryName: string }> = [];
  if (args.ingredient?.id) orClauses.push({ ingredientId: args.ingredient.id });
  if (args.categoryName) orClauses.push({ categoryName: args.categoryName });
  const rules = await prisma.shelfLifeRule.findMany({ where: { OR: orClauses } });

  const est = estimateExpiry({
    purchaseDate: args.purchaseDate,
    storage: args.storage,
    opened: args.opened,
    openedAt: args.openedAt ?? null,
    ingredientId: args.ingredient?.id ?? null,
    categoryName: args.categoryName,
    rules: rules as ShelfLifeRuleish[],
  });

  if (est.source === "ESTIMATED") {
    return { expiryDate: est.expiryDate, expirySource: "ESTIMATED", expiryConfidence: est.confidence };
  }
  return { expiryDate: null, expirySource: "UNKNOWN", expiryConfidence: null };
}

async function categoryNameFor(categoryId: string | null, ingredient: ResolvedIngredient): Promise<string | null> {
  if (categoryId) return (await prisma.category.findUnique({ where: { id: categoryId } }))?.name ?? null;
  return ingredient?.category?.name ?? null;
}

/**
 * Create an inventory item. Pass `db` to run the write inside a caller's
 * interactive transaction (e.g. receipt commit, so a mid-batch failure rolls the
 * whole thing back); the reference-data lookups above always use the base client.
 */
export async function createInventoryItem(
  userId: string,
  input: CreateItemInput,
  db: Prisma.TransactionClient = prisma
) {
  const ingredient = await resolveIngredient(input.ingredientId, input.ingredientName);
  const categoryId = input.categoryId ?? ingredient?.categoryId ?? null;
  const categoryName = await categoryNameFor(categoryId, ingredient);

  const openedAt = input.openedAt ?? (input.opened ? input.purchaseDate : null);
  const expiry = await decideExpiry({
    exactExpiryDate: input.exactExpiryDate,
    ingredient,
    categoryName,
    purchaseDate: input.purchaseDate,
    storage: input.storageLocation,
    opened: input.opened,
    openedAt,
  });

  return db.inventoryItem.create({
    data: {
      userId,
      productName: input.productName,
      ingredientId: ingredient?.id ?? null,
      categoryId,
      quantity: input.quantity,
      unit: input.unit,
      purchaseDate: input.purchaseDate,
      ...expiry,
      storageLocation: input.storageLocation,
      opened: input.opened,
      openedAt,
      price: input.price ?? null,
      currency: input.currency ?? null,
      store: input.store ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "MANUAL",
      receiptId: input.receiptId ?? null,
    },
  });
}

export type UpdateItemInput = CreateItemInput;

/** Update an item, re-deriving expiry with the same rules as create. */
export async function updateInventoryItem(userId: string, id: string, input: UpdateItemInput) {
  const existing = await prisma.inventoryItem.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Item not found");

  const ingredient = await resolveIngredient(input.ingredientId, input.ingredientName);
  const categoryId = input.categoryId ?? ingredient?.categoryId ?? null;
  const categoryName = await categoryNameFor(categoryId, ingredient);

  // Opened now but no opening date yet -> stamp now. Not opened -> clear it.
  const openedAt = input.opened ? input.openedAt ?? existing.openedAt ?? new Date() : null;
  const expiry = await decideExpiry({
    exactExpiryDate: input.exactExpiryDate,
    ingredient,
    categoryName,
    purchaseDate: input.purchaseDate,
    storage: input.storageLocation,
    opened: input.opened,
    openedAt,
  });

  return prisma.inventoryItem.update({
    where: { id },
    data: {
      productName: input.productName,
      ingredientId: ingredient?.id ?? null,
      categoryId,
      quantity: input.quantity,
      unit: input.unit,
      purchaseDate: input.purchaseDate,
      ...expiry,
      storageLocation: input.storageLocation,
      opened: input.opened,
      openedAt,
      price: input.price ?? null,
      currency: input.currency ?? null,
      notes: input.notes ?? null,
    },
  });
}

/**
 * Consume some of an item. Converts the used amount into the stored unit,
 * deducts (never below zero), and records the consumption for the audit trail.
 * Never deletes the item — a used-up item stays at quantity 0 for the user to
 * remove deliberately.
 */
export async function consumeInventoryItem(
  userId: string,
  id: string,
  useQuantity: number,
  useUnit: string,
  recipeId?: string | null
): Promise<
  { ok: true; recordId: string; newQuantity: number; usedUp: boolean; overuse: boolean } | { ok: false; reason: string }
> {
  const item = await prisma.inventoryItem.findFirst({
    where: { id, userId, isDeleted: false },
    include: { ingredient: true, category: true },
  });
  if (!item) return { ok: false, reason: "Item not found." };

  const result = computeDeduction({
    currentQuantity: item.quantity,
    currentUnit: item.unit,
    useQuantity,
    useUnit,
    ingredient: { typicalPieceGrams: item.ingredient?.typicalPieceGrams ?? null },
  });
  if (!result.ok) return { ok: false, reason: result.reason };

  const partial = result.newQuantity > 0;
  // Opening now (first time) -> stamp the date and re-estimate from it.
  const openedAt = partial ? item.openedAt ?? new Date() : item.openedAt;
  let expiryUpdate: Partial<{ expiryDate: Date | null; expirySource: ExpirySource; expiryConfidence: number | null }> = {};
  if (partial && item.expirySource !== "EXACT") {
    expiryUpdate = await decideExpiry({
      exactExpiryDate: null,
      ingredient: item.ingredient ? { ...item.ingredient, category: item.category } : null,
      categoryName: item.category?.name ?? null,
      purchaseDate: item.purchaseDate ?? item.createdAt,
      storage: item.storageLocation,
      opened: true,
      openedAt,
    });
  }

  const [record] = await prisma.$transaction([
    prisma.consumptionRecord.create({
      data: { inventoryItemId: id, quantityUsed: useQuantity, unit: useUnit, recipeId: recipeId ?? null },
    }),
    prisma.inventoryItem.update({
      where: { id },
      data: {
        quantity: result.newQuantity,
        // Fully used up -> remove; partially used -> opened package + fresh estimate.
        ...(partial ? { opened: true, openedAt, ...expiryUpdate } : { isDeleted: true }),
      },
    }),
  ]);

  return {
    ok: true,
    recordId: record.id,
    newQuantity: result.newQuantity,
    usedUp: result.usedUp,
    overuse: result.overuse,
  };
}

/**
 * What one Cook & deduct run changed, for "Dinner done" [5.8]: the records it
 * wrote, each with its item as it is now (used-up items are soft-deleted, so
 * they're still readable). A record has no userId, so ownership is checked
 * through its item, and only records for this recipe count.
 */
export async function getCookSummary(userId: string, recipeId: string, recordIds: string[]) {
  const ids = recordIds.filter(isUuid);
  if (ids.length === 0 || !isUuid(recipeId)) return null;
  const records = await prisma.consumptionRecord.findMany({
    where: { id: { in: ids }, recipeId, inventoryItem: { userId } },
    include: { inventoryItem: true, recipe: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (records.length === 0) return null;
  return { recipeName: records[0].recipe?.name ?? "Dinner", records };
}

/** The live item that most needs using next (today, tomorrow or within 3 days), if any. */
export async function nextToUse(userId: string, now: Date = new Date()) {
  // Anything more than a day past its date classifies as EXPIRED, so skip those.
  const next = await prisma.inventoryItem.findFirst({
    where: {
      userId,
      isDeleted: false,
      quantity: { gt: 0 },
      expirySource: { not: "UNKNOWN" },
      expiryDate: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { expiryDate: "asc" },
  });
  if (!next) return null;
  const status = classifyStatus(next.expiryDate, next.expirySource, now);
  return status === "CRITICAL" || status === "SOON" ? next : null;
}

export async function softDeleteInventoryItem(userId: string, id: string) {
  await prisma.inventoryItem.updateMany({ where: { id, userId }, data: { isDeleted: true } });
}

export async function restoreInventoryItem(userId: string, id: string) {
  await prisma.inventoryItem.updateMany({ where: { id, userId }, data: { isDeleted: false } });
}

export interface InventoryQuery {
  q?: string;
  filter?: string; // all | soon | expired | fridge | freezer | pantry | cupboard
  sort?: "expiry" | "name" | "recent";
}

/** List a user's live inventory with optional search, filter, and sort. */
export async function listInventory(userId: string, query: InventoryQuery = {}) {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = { userId, isDeleted: false, quantity: { gt: 0 } };
  if (query.q && query.q.trim()) {
    where.productName = { contains: query.q.trim(), mode: "insensitive" };
  }
  switch (query.filter) {
    case "soon":
      where.expiryDate = { gte: now, lte: soon };
      break;
    case "expired":
      where.expiryDate = { lt: now };
      break;
    case "fridge":
      where.storageLocation = "REFRIGERATOR";
      break;
    case "freezer":
      where.storageLocation = "FREEZER";
      break;
    case "pantry":
      where.storageLocation = "PANTRY";
      break;
    case "cupboard":
      where.storageLocation = "CUPBOARD";
      break;
    default:
      break;
  }

  const orderBy =
    query.sort === "name"
      ? [{ productName: "asc" as const }]
      : query.sort === "recent"
      ? [{ createdAt: "desc" as const }]
      : [{ expiryDate: { sort: "asc" as const, nulls: "last" as const } }, { createdAt: "desc" as const }];

  return prisma.inventoryItem.findMany({
    where,
    include: { ingredient: true, category: true },
    orderBy,
  });
}

export async function getInventoryItem(userId: string, id: string) {
  return prisma.inventoryItem.findFirst({
    where: { id, userId, isDeleted: false },
    include: { ingredient: true, category: true },
  });
}

export interface RecentItemChip {
  productName: string;
  quantity: number;
  unit: string;
  storageLocation: StorageLocation;
  ingredientName: string | null;
  categoryId: string | null;
}

/**
 * Distinct items the user added in the last 30 days, newest first — the source
 * for the "quick add from your usuals" chips [1q]C. Deduped by product name so a
 * weekly staple shows once. Includes used-up items on purpose: milk and eggs are
 * exactly what gets re-bought.
 */
export async function getRecentlyAddedItems(userId: string, limit = 6): Promise<RecentItemChip[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.inventoryItem.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    include: { ingredient: true },
    take: 60,
  });

  const seen = new Set<string>();
  const out: RecentItemChip[] = [];
  for (const r of rows) {
    const key = r.productName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      productName: r.productName,
      quantity: r.quantity,
      unit: r.unit,
      storageLocation: r.storageLocation,
      ingredientName: r.ingredient?.canonicalName ?? null,
      categoryId: r.categoryId ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Re-estimate expiry for a user's existing items using the current shelf-life
 * rules. Skips items whose expiry was set exactly by the user (source EXACT) so
 * manual dates are never overwritten. Useful after expanding the rule set.
 */
export async function recomputeExpiryForUser(userId: string): Promise<number> {
  const items = await prisma.inventoryItem.findMany({
    where: { userId, isDeleted: false, expirySource: { not: "EXACT" } },
    include: { ingredient: true, category: true },
  });

  let updated = 0;
  for (const item of items) {
    const expiry = await decideExpiry({
      exactExpiryDate: null,
      ingredient: item.ingredient
        ? { ...item.ingredient, category: item.category }
        : null,
      categoryName: item.category?.name ?? null,
      purchaseDate: item.purchaseDate ?? item.createdAt,
      storage: item.storageLocation,
      opened: item.opened,
      openedAt: item.openedAt,
    });
    await prisma.inventoryItem.update({ where: { id: item.id }, data: expiry });
    updated++;
  }
  return updated;
}
