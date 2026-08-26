// UnitService — pure, dependency-free conversion logic.
//
// Why this exists (from the architecture analysis): reconciling mass ↔ count ↔
// volume across parsing, recipes, and consumption is the hardest data problem in
// the app. Keeping the math here — pure and unit-tested — means every other layer
// can rely on it instead of reinventing ad-hoc conversions.
//
// Base units per family: MASS = grams, VOLUME = millilitres, COUNT = pieces.
// These constants mirror the `unit_conversions` seed table; keep them in sync.

export type UnitKind = "MASS" | "VOLUME" | "COUNT";

export interface UnitDef {
  unit: string;
  kind: UnitKind;
  toBaseFactor: number; // multiply a quantity in `unit` by this to get base units
}

export const UNIT_DEFS: UnitDef[] = [
  { unit: "g", kind: "MASS", toBaseFactor: 1 },
  { unit: "kg", kind: "MASS", toBaseFactor: 1000 },
  { unit: "mg", kind: "MASS", toBaseFactor: 0.001 },
  { unit: "oz", kind: "MASS", toBaseFactor: 28.3495 },
  { unit: "lb", kind: "MASS", toBaseFactor: 453.592 },
  { unit: "ml", kind: "VOLUME", toBaseFactor: 1 },
  { unit: "l", kind: "VOLUME", toBaseFactor: 1000 },
  { unit: "cl", kind: "VOLUME", toBaseFactor: 10 },
  { unit: "tsp", kind: "VOLUME", toBaseFactor: 4.929 },
  { unit: "tbsp", kind: "VOLUME", toBaseFactor: 14.787 },
  { unit: "cup", kind: "VOLUME", toBaseFactor: 240 },
  { unit: "pcs", kind: "COUNT", toBaseFactor: 1 },
  { unit: "clove", kind: "COUNT", toBaseFactor: 1 },
  { unit: "slice", kind: "COUNT", toBaseFactor: 1 },
];

// Common human spellings → canonical unit token.
const ALIASES: Record<string, string> = {
  gram: "g", grams: "g", gramme: "g", grammes: "g",
  kilogram: "kg", kilograms: "kg", kilo: "kg", kilos: "kg", kgs: "kg",
  milligram: "mg", milligrams: "mg",
  ounce: "oz", ounces: "oz",
  pound: "lb", pounds: "lb", lbs: "lb",
  milliliter: "ml", millilitre: "ml", milliliters: "ml", millilitres: "ml",
  liter: "l", litre: "l", liters: "l", litres: "l",
  teaspoon: "tsp", teaspoons: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp",
  cups: "cup",
  piece: "pcs", pieces: "pcs", pc: "pcs", pcs: "pcs", x: "pcs", unit: "pcs", units: "pcs",
  cloves: "clove",
  slices: "slice",
};

const DEF_BY_UNIT = new Map(UNIT_DEFS.map((d) => [d.unit, d]));

/** Normalize a free-text unit string to a canonical token, or null if unknown. */
export function normalizeUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase().replace(/\.$/, "");
  if (DEF_BY_UNIT.has(t)) return t;
  if (ALIASES[t]) return ALIASES[t];
  return null;
}

export function unitKind(unit: string): UnitKind | null {
  return DEF_BY_UNIT.get(normalizeUnit(unit) ?? "")?.kind ?? null;
}

export interface Ingredientish {
  typicalPieceGrams?: number | null;
}

/**
 * Convert `quantity` from one unit to another.
 * - Within the same family (mass↔mass, etc.) always works.
 * - COUNT ↔ MASS works only when `ingredient.typicalPieceGrams` is known
 *   (e.g. 2 pcs of chicken breast ≈ 340 g at 170 g/piece).
 * Returns null when the conversion is not determinable — callers must handle
 * this rather than guessing (never silently fabricate a quantity).
 */
export function convert(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  ingredient?: Ingredientish
): number | null {
  const from = DEF_BY_UNIT.get(normalizeUnit(fromUnit) ?? "");
  const to = DEF_BY_UNIT.get(normalizeUnit(toUnit) ?? "");
  if (!from || !to) return null;

  if (from.kind === to.kind) {
    return (quantity * from.toBaseFactor) / to.toBaseFactor;
  }

  const piece = ingredient?.typicalPieceGrams;
  if (!piece || piece <= 0) return null;

  // Cross-family via piece weight (only MASS <-> COUNT supported).
  if (from.kind === "COUNT" && to.kind === "MASS") {
    const grams = quantity * from.toBaseFactor * piece; // pieces -> g
    return grams / to.toBaseFactor;
  }
  if (from.kind === "MASS" && to.kind === "COUNT") {
    const grams = quantity * from.toBaseFactor; // -> g
    return grams / piece / to.toBaseFactor; // g -> pieces
  }
  return null; // VOLUME cross-family needs density we don't model yet
}

/** True when `convert` would return a value for this pair. */
export function canConvert(fromUnit: string, toUnit: string, ingredient?: Ingredientish): boolean {
  return convert(1, fromUnit, toUnit, ingredient) !== null;
}

/** Round to a sensible number of decimals for display (avoids 199.99999). */
export function tidy(n: number): number {
  return Math.round(n * 1000) / 1000;
}
