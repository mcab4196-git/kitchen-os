// Receipt review helpers (PLAN 5.4): pure, unit-tested.
//
// Review used to start every line in the fridge, so rice and canned goods got fridge
// estimates without anyone noticing. A line now starts where its category usually
// lives, and shows the expiry the commit will save, so checking a receipt is
// reading, not data entry.

import { estimateExpiry, type EstimateResult, type ShelfLifeRuleish, type StorageLocation } from "./expiry";

export interface ReviewRef {
  categories: { id: string; name: string; defaultStorage: StorageLocation }[];
  ingredients: { id: string; name: string; categoryId: string | null }[];
}

export interface ReviewLine {
  ingredientName: string;
  categoryId: string;
  storageLocation: StorageLocation;
}

// Receipt lines that clearly aren't groceries, so Review leaves them unticked (the user can
// tick any back). UK lines from the original list, plus what Philippine receipts print:
// VAT lines, senior citizen and PWD discounts, totals and payment lines (PLAN 5.6).
const NON_FOOD = new RegExp(
  "\\b(" +
    [
      "carrier bag", "bag for life", "plastic bag", "bag charge", "deposit", "donation", "voucher", "coupon",
      "loyalty", "points", "charity", "round ?up", "postage", "delivery", "service charge", "gift ?card",
      "vat", "vatable", "vat[- ]exempt", "zero[- ]rated", "senior citizens?", "sc ?disc(ount)?", "pwd",
      "discount", "sub-?total", "total", "amount due", "change", "cash", "gcash", "maya",
    ].join("|") +
    ")\\b",
  "i",
);

export function isNonFood(name: string): boolean {
  return NON_FOOD.test(name);
}

function ingredientOf(name: string, ref: ReviewRef) {
  const n = name.trim().toLowerCase();
  return n ? (ref.ingredients.find((g) => g.name.toLowerCase() === n) ?? null) : null;
}

/** The line's own category, else its ingredient's: the same order `createInventoryItem` uses. */
function categoryOf(line: Pick<ReviewLine, "ingredientName" | "categoryId">, ref: ReviewRef) {
  const id = line.categoryId || ingredientOf(line.ingredientName, ref)?.categoryId || "";
  return ref.categories.find((c) => c.id === id) ?? null;
}

/** Where a line starts: its category's usual place, else the fridge (the safe guess for food). */
export function inferStorage(line: Pick<ReviewLine, "ingredientName" | "categoryId">, ref: ReviewRef): StorageLocation {
  return categoryOf(line, ref)?.defaultStorage ?? "REFRIGERATOR";
}

/** The expiry the commit will estimate for this line, so what Review shows is what gets saved. */
export function lineEstimate(
  line: ReviewLine,
  ref: ReviewRef,
  rules: ShelfLifeRuleish[],
  purchaseDate: Date,
): EstimateResult {
  return estimateExpiry({
    purchaseDate,
    storage: line.storageLocation,
    opened: false,
    ingredientId: ingredientOf(line.ingredientName, ref)?.id ?? null,
    categoryName: categoryOf(line, ref)?.name ?? null,
    rules,
  });
}
