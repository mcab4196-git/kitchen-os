// Validation + cleaning for AI receipt extraction.
//
// The AI is never trusted (§17): its output is validated against a schema and
// then cleaned deterministically before anything touches the database. This file
// is pure (no DB, no network) so it can be unit-tested.

import { z } from "zod";
import { normalizeUnit } from "@/lib/units";
import type { RawReceipt } from "./provider";

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
/**
 * Schema for the items a user submits from the review screen. The AI's output
 * is never committed directly — only this reviewed, user-approved payload is.
 */
export const reviewedItemSchema = z.object({
  receiptItemId: z.string(),
  rawName: z.string(),
  include: z.boolean(),
  productName: z.string().min(1),
  ingredientName: z.string().nullable().optional().default(null),
  categoryId: z.string().nullable().optional().default(null),
  quantity: z.number().positive().nullable().optional().default(null),
  unit: z.string().nullable().optional().default(null),
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
