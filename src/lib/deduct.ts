// Deduction logic for inventory consumption — pure and unit-tested.
//
// When a user cooks with (or otherwise uses) some of an item, we subtract the
// used amount from the stored quantity. The tricky part is units: they might
// store "500 g" but use "0.3 kg" or "2 pcs". We convert the used amount into the
// stored unit via the UnitService and never go below zero. If the units can't be
// reconciled, we refuse rather than guess.

import { convert, tidy, type Ingredientish } from "./units";

export interface DeductInput {
  currentQuantity: number;
  currentUnit: string;
  useQuantity: number;
  useUnit: string;
  ingredient?: Ingredientish;
}

export type DeductResult =
  | { ok: true; newQuantity: number; usedInStoredUnit: number; usedUp: boolean; overuse: boolean }
  | { ok: false; reason: string };

export function computeDeduction(input: DeductInput): DeductResult {
  const { currentQuantity, currentUnit, useQuantity, useUnit, ingredient } = input;

  if (!(useQuantity > 0)) return { ok: false, reason: "Amount used must be greater than zero." };

  const usedInStored = convert(useQuantity, useUnit, currentUnit, ingredient);
  if (usedInStored == null) {
    return { ok: false, reason: `Can't convert ${useUnit} to ${currentUnit} for this item.` };
  }

  const rawRemaining = currentQuantity - usedInStored;
  const overuse = rawRemaining < 0;
  const newQuantity = Math.max(0, tidy(rawRemaining));

  return {
    ok: true,
    newQuantity,
    usedInStoredUnit: tidy(usedInStored),
    usedUp: newQuantity === 0,
    overuse,
  };
}

export interface CookSuggestion {
  suggestedUse: number; // in the stock item's unit; 0 means "you decide"
  convertible: boolean; // false: the recipe amount couldn't be turned into the item's unit
  quantified: boolean; // false: the recipe doesn't say how much
}

/**
 * How much of a stock item one recipe line uses, in the item's own unit (PLAN 5.4).
 * A line with no amount ("salt", "garlic to taste") suggests nothing, so the cook
 * decides rather than the whole pack being deducted. A bare number ("2 eggs")
 * counts pieces. Never more than what's in stock.
 */
export function suggestCookUse(
  line: { quantity: number | null; unit: string | null },
  stock: { quantity: number; unit: string; ingredient?: Ingredientish },
): CookSuggestion {
  if (!line.quantity || line.quantity <= 0) return { suggestedUse: 0, convertible: true, quantified: false };
  const inStockUnit = convert(line.quantity, line.unit || "pcs", stock.unit, stock.ingredient);
  if (inStockUnit == null) return { suggestedUse: 0, convertible: false, quantified: true };
  return { suggestedUse: Math.min(stock.quantity, tidy(inStockUnit)), convertible: true, quantified: true };
}
