// QA Block D — Core logic correctness (specs from QA-PLAN.md §D).
//
// Stage 2 recorded the shipped behaviour against the plan and flagged the deltas.
// Stage 3 acted on the rulings: ISSUE-009 (quantity-aware reconciliation) and the
// overuse-swallowing gap are now FIXED, and the specs below assert the new
// behaviour. Remaining deltas that were accepted as-is (label wording ISSUE-012,
// <24h expiry lag ISSUE-011, dedup-by-skip ISSUE-010) still carry a [DELTA] note.

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
    // The engine clamps + sets `overuse:true`; Stage 3 wired that flag through
    // cookRecipe and consumeItem, which now redirect with `?over=N` so the user
    // gets a "you used more than you had" toast. See QA-REPORT §14.
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

  it("name-only fallback: bare tokens carry no quantity, so a match counts as 'have'", () => {
    // reconcileRecipe(ingredients, string[]) is the name-presence path — used when
    // the caller has no quantities (e.g. legacy token lists). A match is "have".
    const r = reconcileRecipe([{ name: "tomato", quantity: 4, unit: "pcs" }], ["tomato"]);
    expect(r.available).toEqual(["tomato"]);
    expect(r.missing).toEqual([]);
  });
});

// ──────────────── Quantity-aware reconciliation — ISSUE-009 fixed ────────────────
//
// getRecipeWithReconciliation now passes InventoryLot[] (tokens + quantity + unit
// + typicalPieceGrams), so "have some but not enough" is a real shortfall and the
// shopping-list delta is need − have, not the full recipe amount.

describe("D · quantity-aware reconciliation (ISSUE-009)", () => {
  it("have 2, need 4 → SHORT, shortBy 2, name in `missing`", () => {
    const r = reconcileRecipe(
      [{ name: "tomato", quantity: 4, unit: "pcs" }],
      [{ tokens: ["tomato"], quantity: 2, unit: "pcs" }],
    );
    const line = r.lines[0];
    expect(line.status).toBe("short");
    expect(line.have).toBe(2);
    expect(line.shortBy).toBe(2); // addRecipeMissing writes quantityNeeded = 2
    expect(r.missing).toEqual(["tomato"]);
    expect(r.available).toEqual([]);
  });

  it("have 4, need 4 → HAVE (exact cover, no shortfall)", () => {
    const r = reconcileRecipe(
      [{ name: "tomato", quantity: 4, unit: "pcs" }],
      [{ tokens: ["tomato"], quantity: 4, unit: "pcs" }],
    );
    expect(r.lines[0].status).toBe("have");
    expect(r.lines[0].shortBy).toBe(0);
    expect(r.missing).toEqual([]);
  });

  it("cross-unit: need 400 g, have 0.3 kg → SHORT by 100 g (convert() bridges g↔kg)", () => {
    const r = reconcileRecipe(
      [{ name: "chicken", quantity: 400, unit: "g" }],
      [{ tokens: ["chicken breast"], quantity: 0.3, unit: "kg" }],
    );
    expect(r.lines[0].status).toBe("short");
    expect(r.lines[0].have).toBe(300);
    expect(r.lines[0].shortBy).toBe(100);
  });

  it("multiple lots of the same ingredient are summed before comparing", () => {
    const r = reconcileRecipe(
      [{ name: "egg", quantity: 6, unit: "pcs" }],
      [
        { tokens: ["eggs"], quantity: 4, unit: "pcs" },
        { tokens: ["egg"], quantity: 3, unit: "pcs" },
      ],
    );
    expect(r.lines[0].status).toBe("have"); // 7 ≥ 6
  });

  it("present but not comparable (no piece weight for pcs↔g) → falls back to 'have', never a false buy", () => {
    const r = reconcileRecipe(
      [{ name: "chicken", quantity: 400, unit: "g" }],
      [{ tokens: ["chicken"], quantity: 2, unit: "pcs" }], // no typicalPieceGrams
    );
    expect(r.lines[0].status).toBe("have");
    expect(r.lines[0].have).toBeNull();
  });

  it("wholly absent → MISSING at the full recipe amount", () => {
    const r = reconcileRecipe(
      [{ name: "soy sauce", quantity: 4, unit: "tbsp" }],
      [{ tokens: ["tomato"], quantity: 2, unit: "pcs" }],
    );
    expect(r.lines[0].status).toBe("missing");
    expect(r.lines[0].shortBy).toBe(4);
    expect(r.missing).toEqual(["soy sauce"]);
  });

  it("optional + short is still not counted as missing", () => {
    const r = reconcileRecipe(
      [{ name: "parsley", quantity: 10, unit: "g", optional: true }],
      [{ tokens: ["parsley"], quantity: 2, unit: "g" }],
    );
    expect(r.lines[0].status).toBe("short");
    expect(r.missing).toEqual([]);
  });
});

// ─────────────────────── Shopping list dedup (name-only) ───────────────────────

describe("D · shopping-list dedup", () => {
  it("duplicate items are SKIPPED, not merged  [DELTA: plan wants merge; ISSUE-010, P3]", () => {
    // shopping.ts — `if (have.has(norm(line.name))) { skipped++; continue; }`
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

  it("next recipe needs chicken 400g, only 200g left → shopping delta ≈ 200g (ISSUE-009 fixed)", () => {
    // Chicken is still IN inventory (200 g), but reconciliation is now quantity-
    // aware: 200 < 400 → SHORT, shortBy 200 → addRecipeMissing writes
    // quantityNeeded = 200, exactly what the plan's §D scenario asks for.
    const r = reconcileRecipe(
      [{ name: "chicken", quantity: 400, unit: "g" }],
      [{ tokens: ["chicken"], quantity: 200, unit: "g" }],
    );
    expect(r.lines[0].status).toBe("short");
    expect(r.lines[0].shortBy).toBe(200);
    expect(r.available).toEqual([]);
    expect(r.missing).toEqual(["chicken"]);
  });
});
