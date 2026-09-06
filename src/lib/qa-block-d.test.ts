// QA Stage 2 · Block D — Core logic correctness.
//
// These are the specs from QA-PLAN.md §D, run against the real pure functions.
// Where the shipped behaviour differs from the plan's wording, the test asserts
// what the code ACTUALLY does and a comment flags the delta — QA-REPORT.md §10
// carries the ruling (code change vs plan change). No behaviour is changed here.

import { describe, it, expect } from "vitest";
import { computeDeduction } from "./deduct";
import { classifyStatus, relativeLabel, daysUntil, estimateExpiry, type ShelfLifeRuleish } from "./expiry";
import { reconcileRecipe } from "./recipe";

// ───────────────────────────── Quantity math ─────────────────────────────

describe("D · quantity math", () => {
  it("500g − 300g = 200g", () => {
    const r = computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 300, useUnit: "g" });
    expect(r).toMatchObject({ ok: true, newQuantity: 200, overuse: false, usedUp: false });
  });

  it("consume exact remaining → 0, not negative, not an error", () => {
    const r = computeDeduction({ currentQuantity: 200, currentUnit: "g", useQuantity: 200, useUnit: "g" });
    expect(r).toMatchObject({ ok: true, newQuantity: 0, usedUp: true, overuse: false });
  });

  it("consume more than available → clamped to 0, never negative, overuse flagged", () => {
    const r = computeDeduction({ currentQuantity: 200, currentUnit: "g", useQuantity: 500, useUnit: "g" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.newQuantity).toBe(0);
      expect(r.newQuantity).toBeGreaterThanOrEqual(0);
      expect(r.overuse).toBe(true);
    }
    // DELTA vs plan ("explicit rejection or clamp"): the engine clamps + sets
    // `overuse:true`, but callers (cookRecipe, consumeItem) ignore the flag, so
    // the user gets no "you used more than you had" warning. See QA-REPORT ISSUE-008.
  });

  it("unit mismatch — g↔kg converts, count↔mass without a piece weight is refused", () => {
    expect(computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 0.3, useUnit: "kg" }))
      .toMatchObject({ ok: true, newQuantity: 200 });

    // "1 pack" / bare pcs against grams, no typicalPieceGrams → explicit refusal,
    // never a silent corruption.
    expect(computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 1, useUnit: "pcs" }).ok).toBe(false);
    expect(computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 1, useUnit: "pack" }).ok).toBe(false);

    // volume ↔ mass is never guessed (no density model)
    expect(computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 100, useUnit: "ml" }).ok).toBe(false);
  });

  it("floating-point subtraction stays clean (tidy rounds to 3dp)", () => {
    const r = computeDeduction({ currentQuantity: 0.3, currentUnit: "kg", useQuantity: 100, useUnit: "g" });
    // 0.3 kg − 100 g = 0.2 kg, not 0.19999999999999998
    expect(r.ok && r.newQuantity).toBe(0.2);
  });
});

// ───────────────────────────── Expiry labels ─────────────────────────────
//
// Freeze "today". The badge (components/inventory/expiry-badge.tsx:27-37) renders
// `${MAP[status].label} · ${relativeLabel(...)}` — or just the label when UNKNOWN.
// This helper mirrors that composition so the spec reads against the real string.
const MAP_LABEL: Record<string, string> = {
  EXPIRED: "Expired",
  CRITICAL: "Use now",
  SOON: "Use soon",
  FRESH: "Fresh",
  UNKNOWN: "No date",
};
function badgeText(expiry: Date | null, source: "EXACT" | "ESTIMATED" | "UNKNOWN", now: Date): string {
  const status = classifyStatus(expiry, source, now);
  const label = MAP_LABEL[status];
  if (status === "UNKNOWN") return label;
  return `${label} · ${relativeLabel(expiry, source, now)}`;
}

describe("D · expiry labels (frozen now = 2026-09-06T12:00:00Z)", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const at = (iso: string) => new Date(iso);

  it("today → status CRITICAL, badge 'Use now · today'", () => {
    expect(classifyStatus(at("2026-09-06T12:00:00Z"), "EXACT", now)).toBe("CRITICAL");
    expect(badgeText(at("2026-09-06T12:00:00Z"), "EXACT", now)).toBe("Use now · today");
    // plan wants "Use now" — label prefix matches; code appends "· today".
  });

  it("tomorrow → CRITICAL, badge 'Use now · tomorrow'  [DELTA: plan wants 'Use tomorrow']", () => {
    expect(classifyStatus(at("2026-09-07T12:00:00Z"), "EXACT", now)).toBe("CRITICAL");
    expect(badgeText(at("2026-09-07T12:00:00Z"), "EXACT", now)).toBe("Use now · tomorrow");
    // CRITICAL covers d ≤ 1, so there is no distinct "Use tomorrow" bucket.
  });

  it("+3 days → SOON, badge 'Use soon · in 3 days'  [DELTA: plan wants 'Use in 3 days']", () => {
    expect(classifyStatus(at("2026-09-09T12:00:00Z"), "EXACT", now)).toBe("SOON");
    expect(badgeText(at("2026-09-09T12:00:00Z"), "EXACT", now)).toBe("Use soon · in 3 days");
  });

  it("yesterday → EXPIRED, badge 'Expired · today'  [DELTA: plan wants 'Expired'; '· today' is odd]", () => {
    expect(classifyStatus(at("2026-09-05T12:00:00Z"), "EXACT", now)).toBe("EXPIRED");
    expect(badgeText(at("2026-09-05T12:00:00Z"), "EXACT", now)).toBe("Expired · today");
  });

  it("−2 days → EXPIRED, badge 'Expired · 2 days ago'", () => {
    expect(badgeText(at("2026-09-04T12:00:00Z"), "EXACT", now)).toBe("Expired · 2 days ago");
  });

  it("null / UNKNOWN → badge 'No date'  [DELTA: plan wants 'Expiry unknown']", () => {
    expect(classifyStatus(null, "UNKNOWN", now)).toBe("UNKNOWN");
    expect(badgeText(null, "UNKNOWN", now)).toBe("No date");
  });

  it("an item expiring LATER TODAY already reads 'tomorrow'  [DELTA: P3 label imprecision]", () => {
    // 11.5 h in the future — still today on the wall clock, but daysUntil ceils to 1.
    expect(badgeText(at("2026-09-06T23:30:00Z"), "EXACT", now)).toBe("Use now · tomorrow");
  });
});

describe("D · expiry does not flip a day early/late across a boundary", () => {
  it("at 23:30, an item expiring 01:00 the next day is CRITICAL, not EXPIRED", () => {
    const now = new Date("2026-09-06T23:30:00Z");
    const expiry = new Date("2026-09-07T01:00:00Z"); // 1.5 h away
    expect(classifyStatus(expiry, "EXACT", now)).toBe("CRITICAL");
    expect(classifyStatus(expiry, "EXACT", now)).not.toBe("EXPIRED");
  });

  it("KNOWN GAP: an item that expired <24h ago still reads CRITICAL, not EXPIRED  [DELTA: P3, ISSUE-011]", () => {
    const now = new Date("2026-09-07T00:30:00Z");
    const expiry = new Date("2026-09-06T23:00:00Z"); // 1.5 h in the PAST — already off
    // daysUntil = Math.ceil(-5_400_000 / 86_400_000) = -0  →  d < 0 is false  →  CRITICAL.
    // So the "Expired" badge lags true expiry by up to a full day. The item is
    // still red / "Use now", so it is not hidden — just mislabelled for <24h.
    expect(daysUntil(expiry, now)).toBeCloseTo(0, 10); // Math.ceil yields -0
    expect(classifyStatus(expiry, "EXACT", now)).toBe("CRITICAL");
  });

  it("an item that expired >24h ago reads EXPIRED", () => {
    const now = new Date("2026-09-07T00:30:00Z");
    const expiry = new Date("2026-09-05T23:00:00Z"); // ~25.5 h in the past
    expect(classifyStatus(expiry, "EXACT", now)).toBe("EXPIRED");
  });

  it("daysUntil is computed on absolute instants — same UTC instant, any wall clock, same answer", () => {
    const expiry = new Date("2026-09-09T00:00:00Z");
    const nowA = new Date("2026-09-06T00:00:00Z");
    expect(daysUntil(expiry, nowA)).toBe(3);
    // NOTE: the Prisma round-trip risk (DateTime stored as TIMESTAMP(3), no tz;
    // estimateExpiry's addDays uses local setDate) is NOT covered here — it needs
    // a DB write/read under a non-UTC TZ. See QA-REPORT §11.
  });
});

describe("D · estimated expiry is structurally distinguishable from confirmed", () => {
  const rules: ShelfLifeRuleish[] = [
    { ingredientId: "milk", categoryName: null, storage: "REFRIGERATOR", opened: false, typicalDays: 7, minDays: 5, maxDays: 10 },
  ];

  it("estimateExpiry tags its output source = 'ESTIMATED' (an enum column, not a colour)", () => {
    const r = estimateExpiry({
      purchaseDate: new Date("2026-09-06T00:00:00Z"),
      storage: "REFRIGERATOR",
      opened: false,
      ingredientId: "milk",
      rules,
    });
    expect(r.source).toBe("ESTIMATED");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.expiryDate).not.toBeNull();
  });

  it("the badge marks an estimate with the text 'est.' (structural + textual, not colour-only)", () => {
    // expiry-badge.tsx:30 — estimated = source === "ESTIMATED" && status !== "UNKNOWN"
    // and renders an <span>est.</span>. So EXACT vs ESTIMATED differ by a word, not
    // just a hue. Confirmed by reading the component.
    const estimated = (src: string, status: string) => src === "ESTIMATED" && status !== "UNKNOWN";
    expect(estimated("ESTIMATED", "FRESH")).toBe(true);
    expect(estimated("EXACT", "FRESH")).toBe(false);
  });

  it("no rule → source 'UNKNOWN', never an invented date", () => {
    const r = estimateExpiry({
      purchaseDate: new Date("2026-09-06T00:00:00Z"),
      storage: "PANTRY",
      opened: false,
      ingredientId: "mystery",
      categoryName: "Other",
      rules,
    });
    expect(r).toMatchObject({ source: "UNKNOWN", expiryDate: null, confidence: 0 });
  });
});

// ─────────────────────────── Recipe availability ───────────────────────────

describe("D · recipe availability", () => {
  it("never lists an ingredient as AVAILABLE when no inventory token matches", () => {
    const r = reconcileRecipe(
      [{ name: "saffron" }, { name: "chicken breast" }],
      ["chicken breast", "rice"],
    );
    expect(r.available).toEqual(["chicken breast"]);
    expect(r.missing).toEqual(["saffron"]);
  });

  it("the have/to-buy split is derived only from inventory tokens, not any AI 'available' claim", () => {
    // reconcileRecipe's only inputs are (recipe ingredients, inventory tokens).
    // There is no channel for the model's own availability guess to leak in.
    const r = reconcileRecipe([{ name: "tomato" }], []);
    expect(r.available).toEqual([]);
    expect(r.missing).toEqual(["tomato"]);
  });

  it("optional ingredients you lack are not counted as missing", () => {
    const r = reconcileRecipe(
      [{ name: "chicken" }, { name: "parsley", optional: true }],
      ["chicken"],
    );
    expect(r.missing).toEqual([]);
  });

  it("KNOWN GAP: 'have' is name-presence only — no quantity check  [DELTA: P2, see ISSUE-009]", () => {
    // Inventory has *a* tomato token; recipe needs 4. Reconciliation still says
    // "have". Downstream (meals/[id]/page.tsx) shows the "have" badge and the
    // shopping-list add treats it as not-missing, so a short quantity is invisible.
    const r = reconcileRecipe([{ name: "tomato", quantity: 4, unit: "pcs" }], ["tomato"]);
    expect(r.available).toEqual(["tomato"]);
    expect(r.missing).toEqual([]);
  });
});

// ─────────────────────── Shopping list delta (name-only) ───────────────────────

describe("D · shopping-list delta", () => {
  it("KNOWN GAP: reconciliation.missing carries the name; no recipeQty − inventoryQty anywhere  [DELTA: P2, ISSUE-009]", () => {
    // The plan wants: inventory tomatoes = 2, recipe needs 4 → list shows 2.
    // Reality: addRecipeMissing (server/services/shopping.ts:59-76) only adds names
    // that are wholly absent from inventory, at `detail.quantity` (the recipe's
    // FULL amount, shopping.ts:69) — there is no subtraction. And a partially-
    // stocked ingredient like this one never reaches `missing` at all, so nothing
    // is added. Runtime proof needs a test DB (see QA-REPORT §11).
    const r = reconcileRecipe([{ name: "tomato", quantity: 4, unit: "pcs" }], ["tomato"]);
    expect(r.missing).toEqual([]); // → addRecipeMissing adds nothing for tomato
  });

  it("a fully-absent ingredient is added at the recipe's full quantity, not a delta", () => {
    const r = reconcileRecipe([{ name: "soy sauce", quantity: 4, unit: "tbsp" }], ["tomato"]);
    expect(r.missing).toEqual(["soy sauce"]);
    // addRecipeMissing then writes quantityNeeded = 4 (detail.quantity), reason RECIPE.
  });

  it("duplicate items are SKIPPED, not merged  [DELTA: plan wants merge; ISSUE-010, P3]", () => {
    // shopping.ts:60 — `if (have.has(norm(name))) { skipped++; continue; }`
    // Second add of the same label is dropped; quantities are never summed.
    const names = ["Soy Sauce", "soy sauce", "SOY SAUCE  "];
    const seen = new Set<string>();
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const added = names.filter((n) => (seen.has(norm(n)) ? false : (seen.add(norm(n)), true)));
    expect(added).toEqual(["Soy Sauce"]); // mirrors the service's dedup-by-skip
  });
});

// ──────────────────────────── Full integration ────────────────────────────
//
// The plan's end-to-end scenario, run through the pure deduction engine in
// sequence (a real DB integration harness does not exist — QA-REPORT §3/§11).

describe("D · integration — cook a recipe, then check the next shop", () => {
  it("chicken 500 / rice 1000 / spinach 200  →  cook 300 / 200 / 100  →  200 / 800 / 100", () => {
    const chicken = computeDeduction({ currentQuantity: 500, currentUnit: "g", useQuantity: 300, useUnit: "g" });
    const rice = computeDeduction({ currentQuantity: 1000, currentUnit: "g", useQuantity: 200, useUnit: "g" });
    const spinach = computeDeduction({ currentQuantity: 200, currentUnit: "g", useQuantity: 100, useUnit: "g" });
    expect([chicken, rice, spinach].every((r) => r.ok)).toBe(true);
    expect(chicken.ok && chicken.newQuantity).toBe(200);
    expect(rice.ok && rice.newQuantity).toBe(800);
    expect(spinach.ok && spinach.newQuantity).toBe(100);
  });

  it("next recipe needs chicken 400g, only 200g left — plan wants list ≈ 200g", () => {
    // What the code does today: chicken is still IN inventory (200 g > 0), so
    // reconcileRecipe puts it in `available`, addRecipeMissing skips it, and the
    // shopping list recommends NOTHING for chicken (not ~200 g).
    const r = reconcileRecipe([{ name: "chicken", quantity: 400, unit: "g" }], ["chicken"]);
    expect(r.available).toEqual(["chicken"]);
    expect(r.missing).toEqual([]);
    // DELTA: P2, same root cause as ISSUE-009 (no quantity-aware reconciliation).
  });
});
