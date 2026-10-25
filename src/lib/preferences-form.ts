// Preferences from a submitted form: Settings and the sign-up onboarding step
// (PLAN 6.2). Pure and unit-tested. Form data is untrusted, so every field is
// bounded here; a missing field keeps its default, because onboarding asks for
// fewer fields than Settings.

export interface PreferencesInput {
  householdSize: number;
  diet: string | null;
  allergies: string[];
  dislikes: string[];
  cuisines: string[];
  skill: string;
  maxCookMinutes: number;
  unitSystem: string;
  currency: string;
  expiringDays: number;
}

/** What a new account starts with. PHP and metric: the product is for the Philippines (PRODUCT.md). */
export const PREFERENCE_DEFAULTS: PreferencesInput = {
  householdSize: 2,
  diet: null,
  allergies: [],
  dislikes: [],
  cuisines: [],
  skill: "intermediate",
  maxCookMinutes: 45,
  unitSystem: "metric",
  currency: "PHP",
  expiringDays: 2,
};

export const DIET_OPTIONS = [
  ["omnivore", "Omnivore"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["pescatarian", "Pescatarian"],
  ["halal", "Halal"],
  ["kosher", "Kosher"],
] as const;

export const SKILL_OPTIONS = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"],
] as const;

const UNIT_SYSTEMS = ["metric", "imperial"];
const MAX_LIST = 30;
const MAX_WORD = 60;

/** "peanuts, Shellfish, , peanuts" -> ["peanuts", "Shellfish"]: trimmed, de-duplicated, bounded. */
export function listFrom(value: FormDataEntryValue | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of String(value ?? "").split(",")) {
    const word = raw.trim().slice(0, MAX_WORD);
    if (!word || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    out.push(word);
    if (out.length === MAX_LIST) break;
  }
  return out;
}

function intFrom(value: FormDataEntryValue | null, fallback: number, min: number, max: number): number {
  if (value === null || String(value).trim() === "") return fallback;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function oneOf(value: FormDataEntryValue | null, allowed: readonly string[]): string | null {
  const v = String(value ?? "");
  return allowed.includes(v) ? v : null;
}

export function preferencesFromForm(fd: FormData, base: PreferencesInput = PREFERENCE_DEFAULTS): PreferencesInput {
  const has = (k: string) => fd.has(k);
  const currency = String(fd.get("currency") ?? "").trim().toUpperCase();
  return {
    householdSize: intFrom(fd.get("householdSize"), base.householdSize, 1, 20),
    diet: has("diet") ? oneOf(fd.get("diet"), DIET_OPTIONS.map(([v]) => v)) : base.diet,
    allergies: has("allergies") ? listFrom(fd.get("allergies")) : base.allergies,
    dislikes: has("dislikes") ? listFrom(fd.get("dislikes")) : base.dislikes,
    cuisines: has("cuisines") ? listFrom(fd.get("cuisines")) : base.cuisines,
    skill: oneOf(fd.get("skill"), SKILL_OPTIONS.map(([v]) => v)) ?? base.skill,
    maxCookMinutes: intFrom(fd.get("maxCookMinutes"), base.maxCookMinutes, 10, 240),
    unitSystem: oneOf(fd.get("unitSystem"), UNIT_SYSTEMS) ?? base.unitSystem,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : base.currency,
    expiringDays: intFrom(fd.get("expiringDays"), base.expiringDays, 1, 14),
  };
}
