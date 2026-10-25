// Validation + cleaning for AI receipt extraction.
//
// The AI is never trusted (§17): its output is validated against a schema and
// then cleaned deterministically before anything touches the database. This file
// is pure (no DB, no network) so it can be unit-tested.

import { z } from "zod";
import { normalizeUnit } from "@/lib/units";
import { isUuid } from "@/lib/utils";
import type { RawReceipt } from "./provider";

/**
 * The seeded category names (prisma/seed.ts; keep the two in sync). The receipt AI
 * picks one per line, because without a category a line gets no storage place and
 * no expiry estimate (PLAN 5.6: a scan returned no category for 110 of 110 lines).
 */
export const RECEIPT_CATEGORIES = [
  "Meat", "Fish", "Dairy", "Vegetable", "Fruit", "Bakery", "Grain", "Pantry", "Frozen", "Condiment", "Beverage", "Other",
] as const;

/** The receipt instructions both providers send, so their output matches. */
export const RECEIPT_PROMPT =
  "Extract every grocery line item from this receipt (image or PDF). Only include real purchased " +
  "products: skip subtotals, taxes and VAT lines, discounts (including senior citizen and PWD), " +
  "loyalty lines, and payment or card details. For each line: rawName exactly as printed; " +
  "quantity and unit from the line, or from the pack size in the product name (\"Pak Choi 300g\" is " +
  "300 g, \"Milk 1L\" is 1 l, \"2 x Yoghurt\" is 2 pcs), else null; category: the best fit from the " +
  "list for what the product is, whatever the receipt's language. Never invent prices, dates or " +
  "totals: if one isn't printed, use null.";

// Coerce "" -> null, numeric strings -> number, leave numbers alone.
const nullableNumber = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return v;
}, z.number().nullable());

const nullableString = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().nullable()
);

export const receiptItemSchema = z.object({
  rawName: z.string(),
  quantity: nullableNumber.optional().default(null),
  unit: nullableString.optional().default(null),
  price: nullableNumber.optional().default(null),
  category: nullableString.optional().default(null),
});

export const receiptSchema = z.object({
  store: nullableString.optional().default(null),
  purchaseDate: nullableString.optional().default(null),
  currency: nullableString.optional().default(null),
  total: nullableNumber.optional().default(null),
  items: z.array(receiptItemSchema).default([]),
});

export type ValidatedReceipt = z.infer<typeof receiptSchema>;

export interface CleanReceiptItem {
  rawName: string;
  quantity: number | null;
  unit: string | null; // normalized canonical token, or null if unrecognized
  unitRaw: string | null; // what the model said, for display/debugging
  price: number | null;
  category: string | null;
  /** Low confidence when key fields are missing/unparseable — flags the review UI. */
  confidence: number;
}

export interface CleanReceipt {
  store: string | null;
  purchaseDate: Date | null;
  currency: string | null;
  total: number | null;
  items: CleanReceiptItem[];
}

/** Remove anything resembling a payment card number (12–19 digit runs). */
export function redactSensitive(text: string | null): string | null {
  if (!text) return text;
  return text.replace(/\b(?:\d[ -]?){12,19}\b/g, "[redacted]").trim() || null;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Validate raw AI output, then clean it. Returns { ok:false } when the shape is
 * so wrong it can't be trusted at all; otherwise returns cleaned, safe data.
 */
export function validateAndClean(raw: unknown): { ok: true; data: CleanReceipt } | { ok: false; error: string } {
  const parsed = receiptSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "We couldn't make sense of this receipt. Try again, or with a flatter, well-lit photo." };
  }
  const r = parsed.data;

  const items: CleanReceiptItem[] = r.items
    .map((it) => {
      const rawName = it.rawName?.trim() ?? "";
      if (!rawName) return null;

      const quantity = it.quantity != null && it.quantity > 0 ? it.quantity : null;
      const unitRaw = it.unit?.trim() || null;
      const unit = normalizeUnit(unitRaw);
      const price = it.price != null && it.price >= 0 ? it.price : null;
      const category = it.category?.trim() || null;

      // Confidence heuristic: full marks, minus penalties for missing/odd fields.
      let confidence = 1;
      if (quantity == null) confidence -= 0.25;
      if (unitRaw && !unit) confidence -= 0.2; // model gave a unit we couldn't map
      if (price == null) confidence -= 0.1;
      confidence = Math.max(0.1, Math.round(confidence * 100) / 100);

      return { rawName, quantity, unit, unitRaw, price, category, confidence };
    })
    .filter((x): x is CleanReceiptItem => x !== null);

  return {
    ok: true,
    data: {
      store: redactSensitive(r.store),
      purchaseDate: parseDate(r.purchaseDate),
      currency: r.currency?.trim().toUpperCase() || null,
      total: r.total != null && r.total >= 0 ? r.total : null,
      items,
    },
  };
}

/**
 * Reduce a raw receipt line to a bare product name for ingredient lookup, e.g.
 * "Barilla Penne Rigate 500G" -> "barilla penne rigate", "Chicken Breast 0.5kg"
 * -> "chicken breast". Strips size/quantity tokens and stray numbers. Pure.
 */
const blankToNull = (s: string | null) => s?.trim() || null;

/**
 * Schema for the items a user submits from the review screen. The AI's output
 * is never committed directly — only this reviewed, user-approved payload is.
 */
export const reviewedItemSchema = z.object({
  receiptItemId: z.string(),
  rawName: z.string(),
  include: z.boolean(),
  productName: z.string().min(1),
  // PLAN 5.6: a blank field means "none". An empty category id reached the database as
  // an invalid UUID and failed the whole receipt; anything that isn't a UUID is dropped.
  ingredientName: z.string().nullable().optional().default(null).transform(blankToNull),
  categoryId: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((s) => (s && isUuid(s) ? s : null)),
  quantity: z.number().positive().nullable().optional().default(null),
  unit: z.string().nullable().optional().default(null).transform(blankToNull),
  storageLocation: z.enum(["REFRIGERATOR", "FREEZER", "PANTRY", "CUPBOARD", "OTHER"]),
  price: z.number().nonnegative().nullable().optional().default(null),
});

export const reviewedItemsSchema = z.array(reviewedItemSchema);
export type ReviewedItem = z.infer<typeof reviewedItemSchema>;

export function simplifyProductName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\d+([.,]\d+)?\s*(kg|g|mg|l|ml|cl|oz|lb|pcs|pc|x|pack|ct)\b/g, " ") // "500g", "2 x"
    .replace(/\b\d+([.,]\d+)?\b/g, " ") // stray numbers
    .replace(/[^a-z\s]/g, " ") // punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export type { RawReceipt };
