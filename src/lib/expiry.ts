// ExpiryService — pure expiry logic.
//
// Two responsibilities, both dependency-free so they can be unit-tested:
//   1. estimateExpiry(): given the seeded shelf-life rules, pick the most
//      specific matching rule and derive an estimated date + confidence.
//   2. classifyStatus(): turn an expiry date into a UI status badge.
//
// Honesty rule (from the product principles): an estimate is always labelled as
// ESTIMATED and never presented as a certain date. We never invent a date when
// no rule matches — we return UNKNOWN.

export type StorageLocation = "REFRIGERATOR" | "FREEZER" | "PANTRY" | "CUPBOARD" | "OTHER";
export type ExpirySource = "EXACT" | "ESTIMATED" | "UNKNOWN";
export type ExpiryStatus = "EXPIRED" | "CRITICAL" | "SOON" | "FRESH" | "UNKNOWN";

export interface ShelfLifeRuleish {
  ingredientId: string | null;
  categoryName: string | null;
  storage: StorageLocation;
  opened: boolean;
  typicalDays: number;
  minDays: number;
  maxDays: number;
}

export interface EstimateInput {
  purchaseDate: Date;
  storage: StorageLocation;
  opened: boolean;
  openedAt?: Date | null; // when it was opened (defaults to purchaseDate if opened)
  ingredientId?: string | null;
  categoryName?: string | null;
  rules: ShelfLifeRuleish[];
}

export interface EstimateResult {
  source: ExpirySource; // ESTIMATED when a rule matched, else UNKNOWN
  expiryDate: Date | null;
  confidence: number; // 0..1
  matchedBy: "ingredient" | "category" | null;
  minDate: Date | null;
  maxDate: Date | null;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + Math.round(days));
  return r;
}

// When no opened-specific rule exists, an opened item keeps this share of its
// unopened shelf life, counted from the opening date.
const OPENED_FACTOR = 0.5;

/**
 * Estimate expiry. Picks the most specific rule (ingredient > category), and:
 *  - unopened: expiry = purchaseDate + shelf life.
 *  - opened:   expiry = openedAt + opened shelf life (a dedicated "opened" rule if
 *              one exists, else OPENED_FACTOR of the unopened life), capped so it
 *              never exceeds the unopened estimate. Returns UNKNOWN if no rule.
 */
export function estimateExpiry(input: EstimateInput): EstimateResult {
  const { purchaseDate, storage, opened, ingredientId, categoryName, rules } = input;
  const openedAt = input.openedAt ?? (opened ? purchaseDate : null);

  const storagesToTry: StorageLocation[] = storage === "CUPBOARD" ? ["CUPBOARD", "PANTRY"] : [storage];
  const inStorage = rules
    .filter((r) => storagesToTry.includes(r.storage))
    .sort((a, b) => (a.storage === storage ? -1 : 1) - (b.storage === storage ? -1 : 1));

  // Pick the most specific rule for a given opened-state (ingredient > category).
  const pick = (wantOpened: boolean) =>
    (ingredientId && inStorage.find((r) => r.ingredientId === ingredientId && r.opened === wantOpened)) ||
    (categoryName && inStorage.find((r) => r.categoryName === categoryName && r.ingredientId === null && r.opened === wantOpened)) ||
    undefined;

  const unopenedRule = pick(false);
  const openedRule = pick(true);
  const baseRule = unopenedRule ?? openedRule;
  if (!baseRule) {
    return { source: "UNKNOWN", expiryDate: null, confidence: 0, matchedBy: null, minDate: null, maxDate: null };
  }

  const unopenedExpiry = unopenedRule ? addDays(purchaseDate, unopenedRule.typicalDays) : null;

  let ref: Date;
  let rule: ShelfLifeRuleish;
  let expiryDate: Date;
  let derivedOpened = false;

  if (opened && openedAt) {
    // Opened: count from the opening date.
    if (openedRule) {
      rule = openedRule;
      ref = openedAt;
      expiryDate = addDays(openedAt, openedRule.typicalDays);
    } else {
      // No opened rule — derive a shorter life from the unopened one.
      rule = unopenedRule ?? openedRule!;
      ref = openedAt;
      derivedOpened = true;
      const days = Math.max(1, Math.round(rule.typicalDays * OPENED_FACTOR));
      expiryDate = addDays(openedAt, days);
    }
    // Never estimate longer than the unopened shelf life allowed.
    if (unopenedExpiry && unopenedExpiry.getTime() < expiryDate.getTime()) {
      expiryDate = unopenedExpiry;
      ref = purchaseDate;
      rule = unopenedRule ?? rule;
    }
  } else {
    rule = baseRule;
    ref = purchaseDate;
    expiryDate = addDays(purchaseDate, rule.typicalDays);
  }

  const matchedBy: "ingredient" | "category" = rule.ingredientId ? "ingredient" : "category";
  const base = matchedBy === "ingredient" ? 0.85 : 0.6;
  const spread = rule.maxDays - rule.minDays;
  const spreadPenalty = Math.min(0.3, (spread / Math.max(rule.typicalDays, 1)) * 0.3);
  const openedBonus = rule.opened === opened ? 0.05 : 0;
  const derivedPenalty = derivedOpened ? 0.1 : 0;
  const confidence = Math.max(0.2, Math.min(0.95, base - spreadPenalty + openedBonus - derivedPenalty));

  const scale = derivedOpened ? OPENED_FACTOR : 1;
  return {
    source: "ESTIMATED",
    expiryDate,
    confidence: Math.round(confidence * 100) / 100,
    matchedBy,
    minDate: addDays(ref, Math.round(rule.minDays * scale)),
    maxDate: addDays(ref, Math.round(rule.maxDays * scale)),
  };
}

/** Whole days from `now` until `date` (negative if past). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  const ms = date.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Share of shelf life left (0..1) for the freshness bar [5.5], measured from
 * `since` (the purchase date, or the date added when there isn't one) to expiry.
 * Null when there's no reliable date, so an unknown is never drawn as a level.
 */
export function freshness(
  expiryDate: Date | null,
  source: ExpirySource,
  since: Date,
  now: Date = new Date()
): number | null {
  if (!expiryDate || source === "UNKNOWN") return null;
  const left = expiryDate.getTime() - now.getTime();
  if (left <= 0) return 0;
  const total = expiryDate.getTime() - since.getTime();
  // A purchase date after the expiry date is bad input, not "no life left".
  if (total <= 0) return 1;
  return Math.min(1, left / total);
}

/**
 * Classify for the UI badge.
 *   UNKNOWN  — no reliable date
 *   EXPIRED  — past
 *   CRITICAL — today or tomorrow (<= 1 day)
 *   SOON     — within 3 days
 *   FRESH    — more than 3 days out
 */
export function classifyStatus(
  expiryDate: Date | null,
  source: ExpirySource,
  now: Date = new Date()
): ExpiryStatus {
  if (!expiryDate || source === "UNKNOWN") return "UNKNOWN";
  const d = daysUntil(expiryDate, now);
  if (d < 0) return "EXPIRED";
  if (d <= 1) return "CRITICAL";
  if (d <= 3) return "SOON";
  return "FRESH";
}

/**
 * Human-friendly label for an expiry date. Relative by default ("in 2 days",
 * "today", "3 days ago"); with `{ absolute: true }` it returns a plain calendar
 * date ("7 Sep") for the "show expiry dates as text" accessibility preference.
 * The preference flows through here so every surface stays consistent — never
 * fork this function.
 */
export function relativeLabel(
  expiryDate: Date | null,
  source: ExpirySource,
  now: Date = new Date(),
  opts: { absolute?: boolean } = {},
): string {
  if (!expiryDate || source === "UNKNOWN") return "No date";
  if (opts.absolute) {
    return expiryDate.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  const d = daysUntil(expiryDate, now);
  if (d < -1) return `${Math.abs(d)} days ago`;
  if (d === -1 || d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}
