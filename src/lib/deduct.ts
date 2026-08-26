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
