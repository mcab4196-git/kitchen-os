"use server";

import { prisma } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { resolveIngredientByText } from "@/server/services/reference";
import { estimateExpiry, type ShelfLifeRuleish } from "@/lib/expiry";
import type { StorageLocation } from "@prisma/client";

const STORAGE_LABEL: Record<string, string> = {
  REFRIGERATOR: "fridge",
  FREEZER: "freezer",
  PANTRY: "pantry",
  CUPBOARD: "cupboard",
  OTHER: "storage",
};

export type EstimatePreview =
  | {
      ok: true;
      /** Canonical ingredient name, when the match was by ingredient. */
      matchedIngredient: string | null;
      /** yyyy-mm-dd — the date we'd fill in if the field is left blank. */
      expiryDateISO: string;
      minDays: number;
      maxDays: number;
      storageLabel: string;
    }
  | { ok: false };

export interface EstimatePreviewInput {
  ingredientId: string | null;
  ingredientName: string;
  categoryId: string;
  storageLocation: string;
  opened: boolean;
  purchaseDate: string;
}

/**
 * Read-only expiry preview for the add/edit form. Runs the same pure
 * `estimateExpiry` the server uses on save, so the number shown before saving is
 * the number that gets saved. Returns `{ ok: false }` — never an invented date —
 * whenever no shelf-life rule matches.
 */
export async function previewEstimate(form: EstimatePreviewInput): Promise<EstimatePreview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const name = form.ingredientName.trim();
  const ingredient = form.ingredientId
    ? await prisma.ingredient.findUnique({ where: { id: form.ingredientId }, include: { category: true } })
    : name
      ? await resolveIngredientByText(name)
      : null;

  let categoryName: string | null = ingredient?.category?.name ?? null;
  if (!categoryName && form.categoryId) {
    categoryName = (await prisma.category.findUnique({ where: { id: form.categoryId } }))?.name ?? null;
  }
  if (!ingredient?.id && !categoryName) return { ok: false };

  const orClauses: Array<{ ingredientId: string } | { categoryName: string }> = [];
  if (ingredient?.id) orClauses.push({ ingredientId: ingredient.id });
  if (categoryName) orClauses.push({ categoryName });
  const rules = await prisma.shelfLifeRule.findMany({ where: { OR: orClauses } });

  const purchaseDate = form.purchaseDate ? new Date(form.purchaseDate) : new Date();
  if (Number.isNaN(purchaseDate.getTime())) return { ok: false };

  const est = estimateExpiry({
    purchaseDate,
    storage: form.storageLocation as StorageLocation,
    opened: form.opened,
    openedAt: form.opened ? purchaseDate : null,
    ingredientId: ingredient?.id ?? null,
    categoryName,
    rules: rules as ShelfLifeRuleish[],
  });

  if (est.source !== "ESTIMATED" || !est.expiryDate) return { ok: false };

  const dayGap = (d: Date | null) =>
    d ? Math.max(0, Math.round((d.getTime() - purchaseDate.getTime()) / 86_400_000)) : 0;

  return {
    ok: true,
    matchedIngredient: est.matchedBy === "ingredient" ? (ingredient?.canonicalName ?? null) : null,
    expiryDateISO: est.expiryDate.toISOString().slice(0, 10),
    minDays: dayGap(est.minDate),
    maxDays: dayGap(est.maxDate),
    storageLabel: STORAGE_LABEL[form.storageLocation] ?? "storage",
  };
}
