# Kitchen OS — QA Report

> Working document. Claude Code appends to this across sessions so findings survive
> context resets. Every `PASS` must cite a `file:line`, a command's output, or a test
> result. Anything unverified goes under **Not Tested** — never under Passed.

**Branch:** `qa/pre-deploy` — NOT yet created. ~30 files from the recent redesign (PRs 1–7) sit uncommitted on `main` (`git status`). Decide before Stage 2 whether to commit that WIP first; QA fixes should branch from whatever state you intend to deploy.
**Started:** 2026-09-06 (Stage 1)
**Last updated:** 2026-09-06 — Stage 1 recon complete

---

## Overall Status

`NOT ASSESSED` — Stage 1 (recon only) done; no verification or fixes yet.

---

## 1. Application Map

**Stack:** Next.js 15.5.23 (App Router, RSC) · React 19 · Prisma 6.2 (PostgreSQL, pooled `DATABASE_URL` + `DIRECT_URL` for migrations) · Supabase (`@supabase/ssr` cookie auth + Storage) · Zod validation · Tailwind 3.4 · Vitest. AI via a provider abstraction (`src/server/ai/provider.ts`), default **gemini** (`@google/genai`), alt **anthropic** (`@anthropic-ai/sdk`).

**Route groups**
- `src/app/(auth)/login` — email+password sign in / sign up (`login/actions.ts`: `signIn`, `signUp`, `signOut`). Email-confirm flow returns to `src/app/auth/callback/route.ts` (`exchangeCodeForSession`).
- `src/app/(app)/*` — authenticated shell (`(app)/layout.tsx`): guards `user`, upserts a `UserPreference` row, renders `SideNav`/`BottomNav`, `Toaster`, `PrefsEffect`.
- `src/app/page.tsx` → redirects `/dashboard`. `src/app/api/health/route.ts` → `SELECT 1` readiness probe.

**Features / flows**
| Flow | Entry | Server action / service | Writes |
|---|---|---|---|
| Dashboard triage | `(app)/dashboard/page.tsx` | `getExpiryAlerts`, 3 counts, `useSoonItems` query, `getPreferences` | read-only |
| Inventory list (grouped by urgency, 7 filters, 3 sorts, chip counts) | `(app)/inventory/page.tsx` | `listInventory` (`services/inventory.ts:246`) | — |
| Add / edit item + live estimate + quick-add | `inventory/new`, `inventory/[id]/edit` → `ItemForm` | `addInventoryItem` / `editInventoryItem` (`inventory/actions.ts`) → `createInventoryItem` / `updateInventoryItem`; live preview `inventory/estimate-actions.ts` (`previewEstimate`); quick-add read `getRecentlyAddedItems` | `inventory_items` |
| Use / consume item (stepper + fractions) | `inventory/[id]/use` → `ConsumeForm`/`ConsumeFields`; also quick-use `Sheet` in `ItemActions` | `consumeItem` (`inventory/actions.ts:86`) → `consumeInventoryItem` (`services/inventory.ts:176`) | `inventory_items`, `consumption_records` |
| Remove / undo | `ItemActions`, `consume-form.tsx` → `deleteItem` (`?undo=`) → `Toaster` → `restoreItem` | `softDeleteInventoryItem` / `restoreInventoryItem` (soft delete via `isDeleted`) | `inventory_items.isDeleted` |
| Receipt scan → review → commit | `(app)/scan/page.tsx` → `uploadReceipt` (`scan/actions.ts`) → `createAndParseReceipt` (`services/receipt.ts:25`); review `scan/[id]/review/review-form.tsx` → `commitReceiptAction` (`scan/[id]/review/actions.ts`) → `commitReceipt` (`services/receipt.ts:131`) | Supabase Storage, `receipts`, `receipt_items`, `inventory_items`, `ingredient_aliases` |
| Cook suggestions ("What's for dinner?") | `(app)/meals/page.tsx` + `dinner-button.tsx` → `whatsForDinner` (`meals/actions.ts`) → `generateSuggestions` (`services/recipe.ts:82`) | `recipes`, `recipe_ingredients` |
| Recipe detail + reconciliation | `meals/[id]/page.tsx` → `getRecipeWithReconciliation` (`services/recipe.ts:224`) | — |
| Cook a recipe (deduct plan) | `meals/[id]/cook` → `CookForm` → `cookRecipe` (`meals/[id]/cook/actions.ts`) → per-line `consumeInventoryItem` | `inventory_items`, `consumption_records` |
| Save / unsave recipe | `SaveToggle` → `toggleSavedAction` (`meals/actions.ts:24`) → `toggleSaved` | `recipes.saved` |
| Meal plan (3 / 7 days) | `(app)/plan/page.tsx` + `plan-controls.tsx` → `makePlan` (`plan/actions.ts`) → `generateMealPlan` (`services/recipe.ts:318`); view `getLatestPlan` | `meal_plans`, `meal_plan_items`, `recipes` |
| Shopping list (aisle-grouped, optimistic undo) | `(app)/shopping/page.tsx` + `shopping-list.tsx` → `addItemAction` / `toggleCheckedAction` / `removeItemAction` / `clearCheckedAction` (`shopping/actions.ts`); recipe → list `addRecipeMissingAction` → `addRecipeMissing` (`services/shopping.ts:49`) | `shopping_lists`, `shopping_list_items` |
| Receipt history | `(app)/receipts/page.tsx` → `listReceipts`; image via `getReceiptImageUrl` (10-min signed URL) | — |
| Preferences | `settings/preferences` → `savePreferences` → `updatePreferences` (`services/preferences.ts`) | `user_preferences` |
| Accessibility toggles (larger text / reduce motion / absolute dates) | `settings/page.tsx` → `AccessibilitySettings` → `saveAccessibility` (`settings/actions.ts:22`) → `updateAccessibilityPrefs` (stored in `user_preferences.notification_thresholds` JSON) | `user_preferences` |
| Recalculate estimates | `settings/page.tsx` → `recalculateExpiry` → `recomputeExpiryForUser` (`services/inventory.ts:303`) | `inventory_items` |
| Expiry alerts screen | `(app)/alerts/page.tsx` → `getExpiryAlerts` | — |

**Recon observations (not yet findings — verify in Stage 2):**
- `QA-PLAN.md`, `QA-REPORT.md`, `CLAUDE-CODE-PROMPTS.md`, `Kitchen OS Mobile.dc.html` all live in `public/` → served at `/<name>` in production (static). Info-disclosure smell. (Stage 2 F)
- Default AI provider is **gemini** (`provider.ts:89`) but `src/lib/env.ts` only declares `ANTHROPIC_*` keys — no `GEMINI_API_KEY`/`GOOGLE_API_KEY` in the schema. (Stage 2 E/F)
- `middleware.ts` matcher does **not** exclude `/api/*`; `updateSession` has no `/api` allowance, so `/api/health` redirects unauthenticated callers to `/login` instead of answering. (Stage 2 C/F)
- `rls.sql` + `storage.sql` are applied manually (`npm run db:rls`); Prisma runs as a privileged role and bypasses RLS by design — authorization is the service layer. Must confirm both SQL files are applied on the deploy DB. (Stage 2 C)
- `next.config.mjs` sets HSTS/XFO/nosniff/Referrer-Policy/Permissions-Policy but **no Content-Security-Policy**. (Stage 2 F, note only)
- `src/lib/env.ts:29` falls back to `process.env as any` on the client and only `throw`s server-side — intentional, but `env` is imported… (confirm nothing client-side reads a server-only var through it). (Stage 2 F)

---

## 2. Logic Index

| Logic | File:line | Notes |
|-------|-----------|-------|
| **Quantity math** | `src/lib/deduct.ts:23-44` `computeDeduction`; conversion `src/lib/units.ts:80-107` `convert` + `:56-62` `normalizeUnit` + `:115-117` `tidy`; DB path `src/server/services/inventory.ts:176-229` `consumeInventoryItem` | Subtract-and-clamp: `rawRemaining = currentQuantity − usedInStored` (deduct.ts:33) → `Math.max(0, tidy(rawRemaining))` (deduct.ts:35); `overuse` boolean when `rawRemaining < 0` (deduct.ts:34); rejects with reason when `useQuantity ≤ 0` (deduct.ts:26) or units unconvertible (`convert` returns `null` → deduct.ts:29-31). `convert`: same family always; COUNT↔MASS only with `typicalPieceGrams`; VOLUME cross-family → `null` (units.ts:106). `consumeInventoryItem` soft-deletes on `newQuantity === 0` (inventory.ts:223), else marks `opened` + re-estimates; writes a `ConsumptionRecord` in a `$transaction`. Overuse is **clamped, not rejected** (caller `cookRecipe` and `consumeItem` ignore the `overuse` flag). |
| **Expiry calculation** | estimate `src/lib/expiry.ts:62-134` `estimateExpiry`; classify `:150-161` `classifyStatus`; `:137-140` `daysUntil`; labels `:164-184` `relativeLabel`; badge map `src/components/inventory/expiry-badge.tsx:4-10,24-35`; alerts `src/server/services/notifications.ts:23-73` `getExpiryAlerts`; `src/server/services/inventory.ts:46-81` `decideExpiry` (EXACT vs ESTIMATED vs UNKNOWN) | `classifyStatus(date, source, now=new Date())`: `source==='UNKNOWN' || !date` → `UNKNOWN`; `daysUntil<0` → `EXPIRED`; `≤1` → `CRITICAL`; `≤3` → `SOON`; else `FRESH`. `daysUntil = Math.ceil(ms / 86_400_000)`. Badge label map: EXPIRED→"Expired", CRITICAL→"Use now", SOON→"Use soon", FRESH→"Fresh", UNKNOWN→"No date"; renders `"<label> · <relativeLabel>"` and appends "est." when `source==='ESTIMATED'`. **`now` is raw local `new Date()`; `getExpiryAlerts` uses `startOfToday.setHours(0,0,0,0)` (local). Prisma stores `TIMESTAMP(3)` (no tz).** Structural est/exact = `expirySource` enum column + `expiryConfidence`. |
| **Recipe ingredient availability** | `src/lib/recipe.ts:69-81` `reconcileRecipe`, `:50-62` `matches`, `:22-29` `normName`, `:130-159` `analyzeCookability`; service `src/server/services/recipe.ts:224-237` `getRecipeWithReconciliation` (+ `:27-52` `loadInventoryContext`); UI `src/app/(app)/meals/[id]/page.tsx:53-68`; new per-card chips `src/app/(app)/meals/page.tsx:97-135` | Availability is **name-token presence only**: `matches()` compares normalized names by equality or ≥3-char substring against tokens = `productName` + `ingredient.canonicalName` of live inventory (`isDeleted:false, quantity:{gt:0}`). Optional + missing → not counted as missing. **No quantity comparison** — "have" does not check you have *enough*. AI's own "available" claim is never used. |
| **Shopping-list delta** | `src/server/services/shopping.ts:49-78` `addRecipeMissing`; dedup `:25-43` `addManualItem` (`:30-31`), `:54-56` (`have` set); `norm` `:4-6`; UI merge `src/app/(app)/shopping/shopping-list.tsx` (client, optimistic) | Adds each name in `reconciliation.missing` at the **recipe's full quantity** (`detail?.quantity`, shopping.ts:71) — there is **no `recipeQty − inventoryQty` arithmetic anywhere**. Duplicate protection = **skip** if a `norm()`-equal row already exists (not sum/merge). Manual add also skips norm-equal *unchecked* rows only. |
| **Receipt → inventory write** | `src/app/(app)/scan/actions.ts:9-27` `uploadReceipt` → `src/server/services/receipt.ts:25-107` `createAndParseReceipt`; validation gate `src/server/ai/schemas.ts:79-118` `validateAndClean`; commit `src/app/(app)/scan/[id]/review/actions.ts:11-34` (`reviewedItemsSchema.parse`, `src/server/ai/schemas.ts:129-143`) → `src/server/services/receipt.ts:131-184` `commitReceipt` → `src/server/services/inventory.ts:88-125` `createInventoryItem` | Size guard: empty → reject, `> 10 MB` → reject (receipt.ts:27-28). Content-hash dedup: prior `COMMITTED`/`PARSED` blocks (redirect to its review with `?dup=1`); stale `PENDING`/`FAILED` is deleted and re-parsed (receipt.ts:35-42). AI output is **schema-validated before any `receipt_items` row is written** (receipt.ts:61-65 → `$transaction` at :76). Commit consumes the **user-edited `rows` JSON** from the hidden input, re-validated by `reviewedItemsSchema`, so review edits persist. Per item: `createInventoryItem` (expiry estimated, `exactExpiryDate:null`), link `receiptItem.inventoryItemId`, upsert learned `ingredient_alias`, receipt → `COMMITTED`. **Loop is not a transaction** — a mid-loop failure leaves a partial commit + receipt still `PARSED`. |

---

## 3. Testability Matrix

| Area | Verifiable by running code (Vitest / `tsc` / build) | Needs a browser (Playwright not configured) | Needs live keys/services the user must supply |
|------|---|---|---|
| Quantity math (`computeDeduction`, `convert`, `tidy`, `normalizeUnit`) | ✅ pure; existing `deduct.test.ts` (8), `units.test.ts` (15) | — | — |
| Expiry math (`estimateExpiry`, `classifyStatus`, `daysUntil`, `relativeLabel`) | ✅ pure; existing `expiry.test.ts` (19), freeze `now` | Badge rendering / "est." styling / colour-independence needs DOM | — |
| Expiry TZ-boundary behaviour | ⚠️ partial — can test `classifyStatus`/`daysUntil` with crafted UTC `Date`s; can't test real Prisma round-trip tz without a DB | — | Postgres for the round-trip test |
| Recipe reconciliation (`reconcileRecipe`, `matches`, `analyzeCookability`, `scoreRecipe`) | ✅ pure; existing `recipe.test.ts` (13) | — | — |
| Shopping-list delta (`addRecipeMissing` behaviour, dedup) | ⚠️ service touches Prisma — needs a test DB or a Prisma mock; the *decision* logic is inline, not a pure fn | List merge/undo UX | Postgres (or mock) |
| Consume → DB (`consumeInventoryItem`), cook integration, full end-to-end scenario from QA plan §D | ❌ requires Prisma + Postgres; no integration harness exists | — | Postgres |
| AI receipt validation (`validateAndClean`, `redactSensitive`, `simplifyProductName`, `reviewedItemsSchema`) | ✅ pure; existing `schemas.test.ts` (10), `recipe-schemas.test.ts` (4), `recipe-prompt.test.ts` (3) | — | — |
| Receipt pipeline end-to-end (upload → Storage → AI → parse → commit) | ❌ | Upload UI, capture=camera, progress region | Supabase Storage + `AI_PROVIDER` key (gemini or anthropic) |
| Recipe / meal-plan generation | ❌ (AI call) | — | AI provider key |
| Auth: signup/login/logout/session/expiry/redirects | ❌ from code alone | ✅ | Supabase project (auth) |
| Middleware route protection (matcher gaps) | ⚠️ static read of `middleware.ts` + `updateSession`; behaviour needs requests | ✅ (or `curl` against a running server) | running app + Supabase |
| RLS isolation (user A ↔ user B) | ⚠️ static read of every policy in `rls.sql`; live proof needs two users + the browser anon client | — | Supabase project with `rls.sql` + `storage.sql` applied |
| Service-layer authorization (every query scoped by `userId`) | ✅ static audit of `src/server/services/*` + actions | — | — |
| Static health (`tsc --noEmit`, `next build`) | ✅ `npm run typecheck`, `npm run build` | — | `prisma generate` needs write access to `node_modules/.prisma` (intermittent Windows/OneDrive `EPERM`) |
| Secrets in client bundle | ✅ grep `.next/static` after a build | — | — |
| Upload restrictions enforced server-side | ✅ static read (`receipt.ts:27-28`, `scan/actions.ts:17`) + a unit/integration test with an oversized buffer | client `<input accept>` behaviour | — |
| UI wiring (handlers, `href`s resolve, form actions, dialog close, loading/error/empty states) | ⚠️ mostly static grep/read; some needs render | ✅ for real interaction | — |
| Responsive / 200% zoom / reduced-motion / focus / touch targets | ❌ | ✅ Playwright pass required | — |

---

## 4. Test Plan

**Block A — Static health (runnable now)**
1. `npm run typecheck` → expect clean (has been clean through the redesign; `npx next build` also runs it).
2. `npm run build` → if `prisma generate` hits `EPERM`, retry / run `npx prisma generate` once, then `npx next build`. Record the real result.
3. Grep for: `console.log`, `TODO`/`FIXME`, `any` casts in server code, `'use client'` files doing server work, unawaited promises in actions/services, hardcoded IDs/fixtures.
4. Confirm `src/app/(app)/**/loading.tsx` + `error.tsx` coverage; check `error.tsx:9` `console.error(error)` doesn't leak to client (it's client-side already — note only).

**Block B — Data layer (needs DB for the live checks; static otherwise)**
1. `npx prisma validate`; `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code` → expect **drift** (the 3 accessibility booleans are stored in JSON, not columns — intentional per PR6, but confirm no *other* drift). Also `schema.prisma` vs the DB: `migrate status`.
2. Decimal quantities: `InventoryItem.quantity`/`RecipeIngredient.quantity`/`ShoppingListItem.quantityNeeded` are Prisma `Float` → Postgres `double precision`. Verify `500 − 300` etc. don't accumulate FP error (`tidy()` rounds to 3 dp — test `0.1 + 0.2` style cases through `computeDeduction`).
3. Timestamps: all `DateTime` are `TIMESTAMP(3)` (no tz). Trace one item through create → `estimateExpiry` (uses `purchaseDate`) → `classifyStatus` (local `now`) and check no ±1-day flip at 23:00 / 01:00 local and for a non-UTC `TZ`.
4. Cascades: `onDelete: Cascade` on Profile→children and Receipt→items, ConsumptionRecord→InventoryItem. Confirm deleting a receipt (stale-attempt path, `receipt.ts:41`) doesn't orphan `inventory_items` (it shouldn't — items point *back* at the receipt, nullable FK). Confirm `recipe` delete in `generateSuggestions`/`generateMealPlan` cleanup doesn't nuke a planned/consumed recipe.
5. Confirm inventory UI reads DB not fixtures: `listInventory` / dashboard queries all hit `prisma` — spot-check no seeded array is rendered.

**Block C — Auth & isolation (highest priority)**
1. Static: middleware matcher — list every path it does/doesn't run on; confirm `/api/health` behaviour; confirm `(app)/layout.tsx` re-checks `user` server-side (it does, `:15`).
2. Static: for **each** server action and service fn, confirm it calls `supabase.auth.getUser()` (or `requireUserId`/`uid`) and scopes every Prisma query by `userId`. Build a table. Watch `updateInventoryItem` (findFirst-then-update-by-id), `consumeInventoryItem`, `toggleSaved`, `toggleChecked`, `removeItem`, `commitReceipt` (`receiptItem.update` by id — is the parent ownership re-checked? `commitReceipt` verified the receipt, but the `it.receiptItemId` values come from the client payload).
3. Read every RLS policy in `rls.sql`; for inventory / receipts / recipes / meal_plans / shopping_list / profiles state A→B reachability and cite the policy. Note child-table `EXISTS` policies. Confirm `storage.sql` bucket policies.
4. Confirm no `SUPABASE_SERVICE_ROLE_KEY` anywhere; confirm Storage ops use the user's cookie client (`receipt.ts` does).
5. If a Supabase project is available: create 2 users, attempt cross-user reads via the browser anon client and via a forged `id` in an action; otherwise `NOT TESTED` with this note.

**Block D — Core logic tests (write real Vitest specs)**
- Quantity: `500g−300g=200g`; exact remaining → `0`; over-consume → clamp to `0` + `overuse:true` (document that callers **don't** surface a rejection — is that acceptable?); `g↔kg` ok; `pcs↔g` without `typicalPieceGrams` → `{ok:false}`; `l↔g` → `{ok:false}`.
- Expiry (frozen `now`): map QA-plan expectations to **actual** output — badge shows `"Use now · today"`, `"Use now · tomorrow"` (CRITICAL covers ≤1d, so "tomorrow" is *not* its own "Use tomorrow" bucket), `"Use soon · in 3 days"`, `"Expired · N days ago"`, `"No date"`. **Flag the wording delta vs the plan and get a ruling** — code change vs plan change. Add a TZ case: item expiring "tomorrow 00:30 local" must not read EXPIRED at "today 23:30".
- Recipe availability: assert `reconcileRecipe` never puts a name in `available` unless a token matches; assert the meals/[id] "have/to buy" split is derived from `reconciliation.available`, not the recipe's own list.
- Shopping delta: **write the failing spec from the plan** (`have 2, need 4 → buy 2`) and confirm current behaviour is `buy 4` (name-only). Decide severity (P2 likely) and whether a minimal quantity-aware fix fits "smallest diff". Duplicate-add → assert skipped (current) vs merged (plan wants merge).
- Integration (needs DB or a thin Prisma fake): chicken 500 / rice 1000 / spinach 200 → cook 300/200/100 → 200/800/100; then a recipe needing 400 chicken → list should recommend ~200 (will currently recommend 400 or "have", per the delta gap).

**Block E — Receipt pipeline**
- Static-trace the 7 failure cases from the plan against `createAndParseReceipt` + `validateAndClean` + `commitReceiptAction`: unsupported type (only `accept` on the input + `file.type` fallback — is server-side type enforced? **appears not**), oversized (`>10MB` ✅), AI timeout/error (`catch` → `FAILED` ✅), malformed JSON (`validateAndClean` → `{ok:false}` ✅), missing name (`rawName` empty → item dropped ✅), missing qty/price (confidence penalty, still committed ✅), duplicate submit (✅), cancelled upload (client only).
- Confirm edit-before-confirm changes the written row (structurally ✅ — server parses `rows`).
- Live upload → `NOT TESTED` unless an AI key + Storage are provided.

**Block F — Errors & secrets**
- Force: AI down (kill key), DB unreachable (bad `DATABASE_URL`), invalid `[id]`, unauthorized action call, empty form. Confirm friendly messages, no stack/DB string/keys to client.
- `npm run build` then `grep -rE "SUPABASE|ANTHROPIC|GEMINI|GOOGLE|sk-|API_KEY" .next/static` → expect nothing but `NEXT_PUBLIC_SUPABASE_*`.
- Confirm no `NEXT_PUBLIC_*` holds a private credential (`.env.example`, `env.ts` schema).
- Server-side upload type check: add one (currently size-only) or document the gap.
- Note the `public/*.md` + `.dc.html` static exposure.
- `/api/health` behind auth — decide if the matcher should exclude `/api/health`.

**Block G — UI wiring (static) + a11y**
- Grep every `href=` / `<Link` target against the route tree; every `<form action=` against an exported action; every `onClick`/`type="submit"` for a handler; dialog/sheet close paths (`overlay.tsx` ESC + scrim + `onOpenChange` — verify each `Sheet`/`Dialog` caller passes it).
- loading/error/empty per async view — enumerate.
- a11y static: `<label htmlFor>` on every input (PR4 wired the item form; audit the rest — `consume-fields.tsx`, `review-form.tsx` got `aria-label`s, `plan-controls`/storage radios use `sr-only` inputs + `has-[:focus-visible]`), icon-only buttons have `aria-label`, status is word+shape not colour-only (`ExpiryBadge` = word + dot + rail — ✅ by design; verify `alerts/page.tsx` `label()` which is colour class + text ✅).
- Responsive / zoom / reduced-motion / focus-visible / 44px targets → **`NOT TESTED`**, needs a Playwright pass (not configured). Describe the matrix: 375px + 200% zoom for dashboard/inventory/forms/sheets; `prefers-reduced-motion` + the `data-reduce-motion` toggle; keyboard tab order through nav + forms + sheet focus trap; hit-target measurement on `BottomNav`, `PrimaryAction`, chips, steppers, switches.

**Stage 3** — re-run typecheck / build / `npm test` + the new Block D specs; regression-check each fix; fill §12 and §13.

## 5. Progress

| Block | Status | Session |
|-------|--------|---------|
| Stage 1 — Recon | ✅ | 2026-09-06 |
| A — Static health | ⬜ | |
| B — Data layer | ⬜ | |
| C — Auth & isolation | ⬜ | |
| D — Core logic tests | ⬜ | |
| E — Receipt pipeline | ⬜ | |
| F — Errors & secrets | ⬜ | |
| G — UI wiring | ⬜ | |
| Stage 3 — Final verification | ⬜ | |

---

## 6. Passed

_Each line needs evidence: a `file:line`, a command output, or a test name + result._

| # | Area | What was verified | Evidence |
|---|------|-------------------|----------|
| | | | |

---

## 7. Issues Found

_One block per issue. Copy the template._

### ISSUE-001

- **Severity:** P0 / P1 / P2 / P3 / P4
- **Feature:**
- **Problem:**
- **Root cause:**
- **Fix:**
- **Files changed:**
- **Verified by:**
- **Status:** OPEN / FIXED / WON'T FIX

---

## 8. Security Findings

_Secrets exposure, missing auth/authz checks, RLS bypass, unsafe uploads, unsafe queries._

---

## 9. Database / RLS Findings

_Per table, state whether user A can reach user B's rows and cite the policy._

| Table | Isolation verified | Policy | Notes |
|-------|-------------------|--------|-------|
| inventory | | | |
| receipts | | | |
| recipes | | | |
| meal_plans | | | |
| shopping_list | | | |
| profiles | | | |

---

## 10. Core Logic Test Results

| Case | Expected | Actual | Result |
|------|----------|--------|--------|
| 500g − 300g | 200g | | |
| Consume exact remaining | 0, no error | | |
| Consume more than available | rejected/clamped, never negative | | |
| Unit mismatch (g/kg/pack) | defined behavior | | |
| Expiry: today | "Use now" | | |
| Expiry: tomorrow | "Use tomorrow" | | |
| Expiry: +3 days | "Use in 3 days" | | |
| Expiry: yesterday | "Expired" | | |
| Expiry: null | "Expiry unknown" | | |
| Expiry across TZ boundary | no ±1 day drift | | |
| Estimated vs confirmed expiry | distinguishable | | |
| Recipe availability accuracy | never claims missing item is available | | |
| Shopping list: have 2, need 4 | buy 2 | | |
| Duplicate shopping items | merged | | |
| Integration: cook recipe | 200g / 800g / 100g | | |
| Integration: next recipe needs 400g chicken | buy ~200g | | |

---

## 11. Not Tested

_Everything unverified, and what it would take to verify it._

| Area | Why not tested | What's needed |
|------|---------------|---------------|
| | | |

---

## 12. Production Build

- **Result:** PASS / FAIL
- **Command:**
- **Output summary:**

---

## 13. Top 5 Actions Before Deploy

1.
2.
3.
4.
5.
