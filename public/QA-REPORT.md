# Kitchen OS — QA Report

> Working document. Claude Code appends to this across sessions so findings survive
> context resets. Every `PASS` must cite a `file:line`, a command's output, or a test
> result. Anything unverified goes under **Not Tested** — never under Passed.

**Branch:** `qa/pre-deploy` — CREATED off `main`. The ~30 uncommitted redesign files were snapshotted first as `c18eca3 chore(qa): baseline uncommitted redesign WIP before QA pass` so QA fixes produce a clean diff. Deploy target = this branch. Local git identity set to `mark.cabelloit@gmail.com` (repo had none).
**Started:** 2026-09-06 (Stage 1)
**Last updated:** 2026-09-06 — **Stage 3 complete, incl. the four P2 fixes the user ruled on.** ISSUE-002/009/013/014 fixed and re-verified; typecheck + clean prod build + full suite (**109/109**) green. No P0/P1/P2 open. See §14b. (One oddity: three `public/*.md` files were deleted from the working tree mid-session by something outside this session — restored before any commit; see §14 note.)

---

## Overall Status

`STAGE 3 COMPLETE — READY per the QA-PLAN gate (no P0/P1/P2 open). Deploy-config + a browser pass remain, and are the user's call.`

**Hard gate (QA-PLAN):** "Do not mark READY if the production build fails, or if any P0 or P1 remains unfixed." — production build **passes**, and **no P0, P1, or P2 is open**. ISSUE-001 (P1) fixed in `04e3fe7`; ISSUE-002 / 009 / 013 / 014 (P2) fixed in Stage 3 (§14b). Gate satisfied.

**Before you actually deploy (not blockers, but do them):**
- Set `GEMINI_API_KEY` and `NEXT_PUBLIC_SITE_URL` on the deploy target; confirm `rls.sql` + `storage.sql` are applied (§13 item 1).
- Run the browser a11y / responsive pass and the live confirmation of the four code-verified fixes (§13 items 2–3) — neither could run in this environment (no Playwright, no live stack).
- P3 batch (§13 item 4) is non-blocking.

**Verification summary:** Static health green (typecheck + prod build pass; no lint tooling exists — §11). Data layer consistent, no drift. Auth/isolation clean at the service layer; RLS + Storage policies live on the DB.

**Blocks D–G + P2 fixes:** `src/lib/qa-block-d.test.ts` now 33 specs, full suite **109/109**. Quantity math correct and safe (clamps, never negative, refuses unconvertible units); over-consumption is now **surfaced to the user** (`?over` toast), not swallowed. Recipe availability + shopping-list delta are now **quantity-aware** — `convert()`-based `need − have`, with a `short` state (ISSUE-009 fixed). Receipt commit is now **transactional** (ISSUE-013 fixed). Regenerating dinner suggestions **no longer deletes meal-plan recipes** (ISSUE-002 fixed). AI provider standardised on **gemini**, `env.ts` + `.env.example` aligned (ISSUE-014 fixed). Expiry labels still drift from the plan's wording and lag true expiry by <24h — **accepted as-is** this pass (P3, ISSUE-011/012). Client bundle carries no private secrets. UI wiring: every `href`/form-action/handler resolves; overlays have full close paths; loading/error/empty states present on every async view.

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
| A — Static health | ✅ | 2026-09-06 |
| B — Data layer | ✅ | 2026-09-06 |
| C — Auth & isolation | ✅ | 2026-09-06 |
| D — Core logic tests | ✅ | 2026-09-06 |
| E — Receipt pipeline | ✅ | 2026-09-06 |
| F — Errors & secrets | ✅ | 2026-09-06 |
| G — UI wiring | ✅ | 2026-09-06 |
| Stage 3 — Final verification (14a) | ✅ | 2026-09-06 |
| Stage 3 — P2 fixes applied (14b) | ✅ | 2026-09-06 |

---

## 6. Passed

_Each line needs evidence: a `file:line`, a command output, or a test name + result._

| # | Area | What was verified | Evidence |
|---|------|-------------------|----------|
| A1 | Static — typecheck | `tsc --noEmit` clean, before and after the P1 fix | `npm run typecheck` → exit 0, no output (2026-09-06) |
| A2 | Static — production build | `prisma generate && next build` succeeds; 18 routes compiled, static + dynamic split as expected; no `EPERM` this run | `npm run build` → "✓ Compiled successfully", "✓ Generating static pages (18/18)", route table printed |
| A3 | Static — no debug/mock cruft | No `console.log/debug/info`; no `TODO/FIXME/HACK/XXX`; no `mock/fixture/dummy/seed` arrays in `src/app`, `src/components`, `src/server`; only benign `console.error` in `env.ts:25` (server, pre-throw) and `error.tsx:8` (client boundary) | `grep` runs, 2026-09-06 |
| A4 | Static — no floating promises | Every `prisma.*` call in services/actions is `await`ed, `return`ed, or an element of `$transaction([...])` / `Promise.all([...])` | read of `inventory.ts:214`, `receipt.ts:69,76`, `reference.ts:5`; grep of all `actions.ts` |
| A5 | Static — client/server boundary | 26 `'use client'` files; none import `@/server/*` or `prisma` at runtime (only `item-form.tsx` has 2 `import type` — erased); no `async` client components | `grep` + read `item-form.tsx:5,7` |
| A6 | Loading/error coverage | 9 `loading.tsx` (incl. `(app)/loading.tsx` as nested fallback); `(app)/error.tsx` + `app/global-error.tsx` boundaries; `app/not-found.tsx`. `error.tsx` renders a generic message, leaks no `error` detail to the user | `find` + read `error.tsx` |
| B1 | Schema validity | `prisma validate` → "schema is valid"; `prisma migrate status` → "Database schema is up to date!" (3 migrations, all applied) | command output, 2026-09-06 |
| B2 | No schema/DB drift | `prisma migrate diff --from-schema-datasource --to-schema-datamodel --exit-code` → "No difference detected." Live DB matches `schema.prisma` exactly; the 3 accessibility booleans live in `user_preferences.notification_thresholds` JSON by design, not as columns — no drift | command output |
| B3 | Inventory UI reads the DB | Live DB holds 70 `inventory_items`, 8 `recipes`, 3 `receipts`, 2 `profiles`; `inventory/page.tsx:3` → `listInventory` (Prisma), `dashboard/page.tsx:34-40` → `prisma.inventoryItem`; no seeded array rendered | `$queryRaw` row counts + import grep |
| B4 | Cascade safety | `Receipt`→`InventoryItem` FK is nullable, no rule → `SetNull` (deleting a stale receipt keeps items); `ConsumptionRecord`→`InventoryItem` is `Cascade` but app soft-deletes (`isDeleted`), so audit trail survives normal use; `MealPlanItem`/`ConsumptionRecord`→`Recipe` are `SetNull` | `schema.prisma:227,263,343,344,392,393` |
| C1 | Middleware re-verifies user | `middleware.ts` → `updateSession` calls `supabase.auth.getUser()` (validates JWT, not just cookie); `(app)/layout.tsx:12-16` re-checks `user` server-side and `redirect("/login")` — "never trust a single gate" | read both files |
| C2 | Actions derive userId server-side | All 10 `actions.ts` + every server-rendered page get the id from `supabase.auth.getUser()` and pass `user.id` to services; none accept a client-supplied userId. `requireUserId()` / `uid()` helpers `redirect("/login")` when absent | grep + read of every action file |
| C3 | Service-layer scoping | `inventory.ts`, `shopping.ts`, `recipe.ts`, `preferences.ts`, `notifications.ts`: every read/write filtered by `userId` (or parent id already proven owned). "findFirst-then-update-by-id" spots (`updateInventoryItem:131`, `consumeInventoryItem:183`, `toggleSaved:214`, `toggleChecked:82`, `commitReceipt:136`) all gate on an ownership `findFirst`/`updateMany` first | full read of all 5 service files |
| C4 | RLS applied on live DB | All 13 user tables + 5 reference tables have `rowsecurity = ON`; every policy from `rls.sql` is present with matching `USING`/`WITH CHECK` (`auth.uid() = user_id`, child tables via `EXISTS` on parent) | `pg_class` / `pg_policies` query, 2026-09-06 |
| C5 | Storage isolation | Bucket `receipts` exists and is `public = false`; 4 `storage.objects` policies restrict every op to `(storage.foldername(name))[1] = auth.uid()::text`; images served only via 10-min signed URLs from the user's cookie client | `storage.buckets` / `pg_policies` query |
| C6 | Signup trigger | `on_auth_user_created` AFTER INSERT on `auth.users` is enabled; `handle_new_user()` is `SECURITY DEFINER` and upserts `profiles` | `pg_trigger` / `pg_proc` query |
| C7 | No service-role key | No `SUPABASE_SERVICE_ROLE_KEY` / `service_role` reference anywhere in `src`; all Supabase clients use `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookies | `grep -rn` |
| D1 | Quantity math — subtract | `500g − 300g = 200g`; `0.3kg − 100g = 0.2kg` (no FP drift, `tidy` 3dp) | `qa-block-d.test.ts` "D · quantity math" — 5 tests pass |
| D2 | Quantity math — never negative | consume-exact → `0` + `usedUp`; over-consume → clamp `0`, `overuse:true`, `newQuantity ≥ 0`; non-positive → `{ok:false}` | same file; also `deduct.test.ts` (8) |
| D3 | Quantity math — unit safety | `g↔kg` converts; `pcs`/`pack` vs `g` with no `typicalPieceGrams` → `{ok:false}`; `ml` vs `g` → `{ok:false}`. No silent corruption | `qa-block-d.test.ts`; `units.test.ts` (15) |
| D4 | Expiry classification | today→CRITICAL, +3d→SOON, −2d→EXPIRED, null→UNKNOWN; boundary at 23:30 for a 01:00 expiry stays CRITICAL (no early flip); `daysUntil` is instant-based (TZ-agnostic for a given Date pair) | `qa-block-d.test.ts` "D · expiry…" — 11 tests; `expiry.test.ts` (19) |
| D5 | Estimated vs confirmed expiry | `estimateExpiry` tags `source:'ESTIMATED'` (enum column) + confidence; badge adds textual `est.` marker (word, not colour); no rule → `source:'UNKNOWN'`, never an invented date | `qa-block-d.test.ts` "D · estimated…"; read `expiry-badge.tsx:30` |
| D6 | Recipe availability grounding | `reconcileRecipe` puts a name in `available` only when an inventory token matches; the meals/[id] have/to-buy split derives from `reconciliation.available` (`page.tsx:26`), never an AI claim; optional-missing not counted | `qa-block-d.test.ts` "D · recipe availability"; `recipe.test.ts` (13) |
| D7 | Integration (pure chain) | chicken 500 / rice 1000 / spinach 200 → cook 300/200/100 → **200 / 800 / 100** via `computeDeduction` in sequence | `qa-block-d.test.ts` "D · integration" |
| E1 | AI output validated before any DB write | `createAndParseReceipt` runs `validateAndClean(raw)` and returns early on `{ok:false}` **before** the `$transaction` that writes `receipt` + `receipt_items` (`receipt.ts:61-99`). Malformed JSON → generic "unexpected shape" message | read `receipt.ts`, `schemas.ts:79-118` |
| E2 | Receipt failure paths | empty file → reject; `>10MB` → reject (`receipt.ts:27-28`); AI throw/timeout → `catch` sets status `FAILED`; missing `rawName` → item dropped; missing qty/price → confidence penalty, still committable; duplicate (same content hash, prior `PARSED`/`COMMITTED`) → blocked + `?dup=1` redirect; stale `PENDING`/`FAILED` → deleted & re-parsed | static trace of `receipt.ts:25-107` |
| E3 | Review edits persist to the written row | commit consumes the user-edited `rows` JSON, re-parsed by `reviewedItemsSchema`; `commitReceipt` writes `it.productName/quantity/unit/storageLocation` from that payload, not the raw AI values | read `review-form.tsx:86`, `review/actions.ts:23`, `receipt.ts:154-170` |
| E4 | Receipt-item ownership re-checked | the ISSUE-001 fix stands: `commitReceipt` loads the verified receipt's own `receipt_items` id set and rejects any `receiptItemId` not in it (`receipt.ts:146-151`) | read; `typecheck` clean |
| F1 | No secrets in client bundle | `grep -rlE "sk-ant-\|AIza…\|SERVICE_ROLE\|ANTHROPIC_API_KEY\|GEMINI_API_KEY\|DATABASE_URL\|DIRECT_URL\|eyJ…JWT" .next/static` → **no matches** (exit 1) after a clean prod build; supabase *client* code is present (sanity grep exit 0) | commands, 2026-09-06 |
| F2 | No private `NEXT_PUBLIC_*` | schema (`env.ts:9-19`) exposes only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design), `NEXT_PUBLIC_SITE_URL`. No client file imports `@/lib/env` | `env.ts`, `.env.example`, grep |
| F3 | Server errors don't leak to client | `(app)/error.tsx` renders a fixed message (no `error.message`); its `console.error` is client-side only. Server-action throws surface as a Next digest, not a stack. Auth actions return Supabase's user-facing `error.message` (intended) | read `error.tsx`, `login/actions.ts`, `inventory/actions.ts` |
| F4 | Security headers | `next.config.mjs` sets HSTS (2y, preload), XFO DENY, nosniff, Referrer-Policy, Permissions-Policy (camera=self), no `X-Powered-By`. (CSP still absent — S3) | read `next.config.mjs` |
| G1 | Every route target resolves | all static `href`s and every dynamic `` href={`/…/${id}/…`} `` map to a real entry in the route tree (19 routes); `PageHeader back=` targets valid | grep of `href=` / `<Link` vs `find src/app` |
| G2 | Every form posts to a real action | all 17 `<form action=>` targets are exported `"use server"` functions (`deleteItem`, `restoreItem`, `commitReceiptAction`, `addRecipeMissingAction`, `clearCheckedAction`, `signOut`, `recalculateExpiry`, …); `useActionState` forms wired the same | grep `export async function` in every `actions.ts` |
| G3 | Overlay close paths | `Sheet`/`Dialog` (`overlay.tsx`) each close via ESC, scrim click, and an explicit control (Sheet: `×` button; Dialog: Cancel); focus trap + focus restore + body-scroll-lock; `motion-reduce:transition-opacity` fallback. Every caller passes `onOpenChange` | read `overlay.tsx`, `item-actions.tsx` |
| G4 | Loading / error / empty per async view | 8 route `loading.tsx` + `(app)/loading.tsx` shell fallback covers the rest; `(app)/error.tsx` + `global-error.tsx` + `not-found.tsx`; `EmptyState` on dashboard, inventory (×2), meals, plan, receipts, shopping, alerts, scan-review | `find` + grep `EmptyState` |
| G5 | a11y primitives | `Button` has `focus-visible:outline`; `Field` renders `<label htmlFor>`; `Checkbox` focus-visible; icon-only buttons carry `aria-label` (scan camera, sheet close, shopping check/remove, item remove, toast dismiss); status uses word+dot+rail not colour alone (`ExpiryBadge`); `prefers-reduced-motion` handled by CSS media query **and** a user toggle (`data-reduce-motion`) | read `button.tsx`, `field.tsx`, `overlay.tsx`, `shopping-list.tsx`, `globals.css:136-170` |

---

## 7. Issues Found

_One block per issue. Copy the template._

### ISSUE-001

- **Severity:** P1 (security — cross-user write / broken isolation)
- **Feature:** Receipt review → commit to inventory
- **Problem:** `commitReceipt(userId, receiptId, items)` verified ownership of the parent **receipt**, then looped the client-supplied `items` and ran `prisma.receiptItem.update({ where: { id: it.receiptItemId }, data: { inventoryItemId: … } })`. `receiptItemId` is `z.string()` from the review form's hidden JSON payload with no server cross-check. An authenticated user could submit their own valid `receiptId` (passes the check) plus `receiptItemId` values belonging to **another user's** `receipt_items`, repointing those rows' `inventoryItemId`. Prisma connects with a privileged role and **bypasses RLS**, so the `own via receipt` policy did not stop it. `ReceiptItem.inventoryItemId` is `@unique`, so a collision also throws mid-loop → partial commit. No data is read back to the attacker (return value ignored) — this is write-side tampering / integrity, not disclosure.
- **Root cause:** Trusting an id from the client payload for a write, instead of constraining the update to the already-verified parent.
- **Fix:** Before the commit loop, load the id set of `receipt_items` for the verified receipt and reject the whole request if any included line's `receiptItemId` isn't in it (`"Those items don't belong to this receipt."`). Smallest diff; no behaviour change for legitimate submissions.
- **Files changed:** `src/server/services/receipt.ts` (commit `04e3fe7`)
- **Verified by:** `npm run typecheck` → exit 0 after the change; logic review (bogus/foreign `receiptItemId` now returns an error before any write). Live two-user exploit attempt: `NOT TESTED` (needs the browser anon client + a forged payload) — see §11.
- **Status:** FIXED

---

### ISSUE-002

- **Severity:** P2
- **Feature:** "What's for dinner?" suggestions vs. Meal plan
- **Problem:** `generateSuggestions` ends with `prisma.recipe.deleteMany({ where: { userId, saved: false, id: { notIn: currentSetIds } } })` (`recipe.ts:158`). It deletes **every** unsaved recipe not in the fresh suggestion set — with no guard for recipes referenced by a `meal_plan_items` row. Recipes created by `generateMealPlan` are `saved: false` and `lastSuggestedAt: null` (`persistRecipe` never stamps it). So opening the meals screen and regenerating suggestions **hard-deletes the recipes in an existing meal plan**; `MealPlanItem.recipe` is `SetNull`, so `getLatestPlan` then returns items with `recipe: null` and the plan silently loses its dinners. Same delete also nulls `ConsumptionRecord.recipeId` (SetNull), losing the recipe link in the "audit trail". `generateMealPlan`'s own cleanup (`recipe.ts:389`) is correctly scoped (`lastSuggestedAt: null` AND `id in newIds` from that call) and is not affected.
- **Root cause:** The prune predicate treats "not in the current suggestion set" as "safe to delete", ignoring other references (meal plans, consumption history).
- **Ruling (2026-09-06):** apply the `NOT: { mealPlanItems: { some: {} } }` guard.
- **Fix (applied):** `generateSuggestions`' prune `deleteMany` now carries `NOT: { mealPlanItems: { some: {} } }`, so a recipe any meal plan still points at is never pruned. `consumption_records` deliberately left out of the guard — `ConsumptionRecord.recipeId` is `SetNull` and losing the recipe *name* on a historical consumption row is cosmetic, not a broken plan. `generateMealPlan`'s own cleanup (`recipe.ts:390`) was already scoped to just-created unplanned ids and is unchanged.
- **Files changed:** `src/server/services/recipe.ts` (Stage 3 — see §14 for commit)
- **Verified by:** `npm run typecheck` → exit 0; `npm run build` → exit 0; full suite 109/109. Runtime repro still `NOT TESTED` (needs an AI key to generate recipes + a plan) — see §11.
- **Status:** FIXED

---

### ISSUE-003

- **Severity:** P3 (was flagged in recon; confirmed)
- **Feature:** `/api/health` readiness probe
- **Problem:** `middleware.ts` matcher runs on `/api/*` (only `_next/static`, `_next/image`, `favicon.ico`, and image extensions are excluded). `updateSession` treats `/api/health` as a normal route: no session → **307 redirect to `/login`**. Uptime monitors / load-balancer health checks get a redirect, not the `SELECT 1` `200`. `/robots.txt` is gated the same way (P4).
- **Root cause:** `updateSession`'s allow-list (`isAuthRoute`, `isPublicAsset`) has no entry for `/api` public endpoints.
- **Fix (proposed, not yet applied):** add `path === "/api/health"` (or `path.startsWith("/api/")` for genuinely public API routes) to the allow-list in `src/lib/supabase/middleware.ts`, or exclude it in the matcher. One line.
- **Files changed:** none yet
- **Verified by:** read of `src/middleware.ts` + `src/lib/supabase/middleware.ts:34-46`; build output confirms `/api/health` and `/robots.txt` are routes. Live `curl` `NOT TESTED` (needs the running server).
- **Status:** OPEN

---

### ISSUE-004

- **Severity:** P3
- **Feature:** Server-rendered pages — missing-session handling
- **Problem:** `dashboard/page.tsx:28`, `meals/page.tsx:89`, `receipts/page.tsx:29`, `scan/[id]/review/page.tsx:33` use `user!.id` (non-null assertion) with **no** `if (!user) redirect("/login")`. Other pages (`inventory/page.tsx:41`, `inventory/new/page.tsx`, `inventory/[id]/*`) do guard explicitly. In practice `(app)/layout.tsx` redirects first, so this is only reachable in a race / if the layout guard regresses — then it throws (`Cannot read properties of null`) and renders `error.tsx` instead of redirecting. No data leak.
- **Root cause:** Inconsistent guard pattern introduced by the redesign of these pages.
- **Fix (proposed, not yet applied):** add the same `if (!user) redirect("/login")` line to the four pages for consistency and a graceful failure.
- **Files changed:** none yet
- **Verified by:** grep + read.
- **Status:** OPEN

---

### ISSUE-005

- **Severity:** P3 (design risk — shared mutable state, not data-ownership isolation)
- **Feature:** Receipt commit → ingredient-alias learning
- **Problem:** `commitReceipt` does `prisma.ingredientAlias.upsert({ where: { aliasText: key }, … })` where `aliasText` is **globally unique** (`schema.prisma:157`), `source: "USER"`. One user's receipt-text correction becomes a global mapping that `resolveIngredientByText` then applies to **every** user's future receipts. A malicious or careless user can mis-train the shared alias table (e.g. map a common token to the wrong ingredient) for everyone. Appears intentional ("normalization memory… improving over time", `AliasSource.USER`) but has no per-user scoping or review.
- **Root cause:** Alias store is global by schema design; commit writes to it directly from user input.
- **Fix:** product ruling needed — scope learned aliases per user, or gate `USER` aliases behind a confidence/consensus threshold, or accept the risk for v1. No code change made.
- **Files changed:** none
- **Verified by:** read `receipt.ts:167-178`, `schema.prisma:147-160`, `reference.ts`.
- **Status:** OPEN

---

### ISSUE-006

- **Severity:** P4
- **Feature:** Shopping list bootstrap
- **Problem:** `getOrCreateList` (`shopping.ts:9-13`) does `findFirst` then `create`; `ShoppingList` has only `@@index([userId])`, no unique constraint. Two near-simultaneous first actions could create two lists for one user; later reads use `findFirst … orderBy createdAt asc`, so items could split across lists.
- **Root cause:** No DB-level "one list per user" guarantee.
- **Fix:** add `@@unique([userId])` (needs a migration) or upsert on a deterministic key. Low likelihood; deferred.
- **Files changed:** none
- **Verified by:** read `shopping.ts` + `schema.prisma:352-363`.
- **Status:** OPEN

---

### ISSUE-007

- **Severity:** P3 (deploy-config, not code)
- **Feature:** Sign-up email confirmation link
- **Problem:** `login/actions.ts:23` builds `emailRedirectTo` from `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`. If `NEXT_PUBLIC_SITE_URL` is unset in the deploy env, confirmation emails link to `localhost`. (`env.ts` defaults it too, but only the validated `env` object — this file reads `process.env` directly.)
- **Fix:** ensure `NEXT_PUBLIC_SITE_URL` is set in the production environment; add to the deploy checklist. Optionally read from `env` instead of `process.env`.
- **Files changed:** none
- **Verified by:** read `login/actions.ts`, `env.ts`, `.env.example:20`.
- **Status:** OPEN

---

### ISSUE-008

- **Severity:** P3 (info-leak — infra error strings to the client)
- **Feature:** Receipt scan (upload → parse)
- **Problem:** `createAndParseReceipt`'s outer `catch` returns `e.message` verbatim (`receipt.ts:104`), and the storage-upload failure returns `` `Couldn't store the image: ${upErr.message}` `` (`receipt.ts:51`). Both bubble through `uploadReceipt` → `state.error` and render in `scan/page.tsx:126` (`role="alert"`). So AI-SDK and Supabase-Storage internals reach the end user: e.g. `"GEMINI_API_KEY is not set."`, `"[GoogleGenerativeAI Error]: …"`, `"429 Too Many Requests"`, `"fetch failed"`, a storage RLS message. No key *value* is exposed, but it discloses provider, config state, and rate-limit posture. Recipe generation is safe here — `meals/actions.ts` maps failures to a generic string.
- **Root cause:** Error passthrough instead of a mapped user-facing message.
- **Fix (proposed, not applied):** in the `catch`, log `e` server-side and return a fixed message ("Couldn't read that receipt — try a sharper photo, or try again in a minute."); keep the specific reason only for `validateAndClean`'s already-generic output.
- **Files changed:** none
- **Verified by:** read `receipt.ts:44-107`, `scan/actions.ts:21-26`, `scan/page.tsx:126-133`.
- **Status:** OPEN

---

### ISSUE-009

- **Severity:** P2 (core functionality incorrect — the plan's headline scenario fails)
- **Feature:** Recipe availability + shopping-list delta
- **Problem:** Reconciliation is **name-presence only**; there is **no `recipeQty − inventoryQty` arithmetic anywhere in the codebase**. `matches()` (`recipe.ts:50-62`) returns true if any inventory token name-matches, regardless of quantity or unit. Consequences:
  - `meals/[id]/page.tsx` shows the green **"have"** badge for an ingredient you're short on (2 tomatoes when the recipe needs 4).
  - `addRecipeMissing` (`shopping.ts:59-76`) only adds names **wholly absent** from inventory, and adds them at the recipe's **full** `detail.quantity` (`shopping.ts:69`) — never a delta. A partially-stocked ingredient never reaches `missing`, so nothing is added for it.
  - QA-PLAN §D end-to-end: after cooking, chicken is at 200 g; the next recipe needs 400 g → plan expects the list to recommend ~200 g. Actual: chicken is still in inventory, so it's "have" and the list recommends **nothing**.
- **Root cause:** `reconcileRecipe` / `addRecipeMissing` model availability as a set-membership test, not a quantity comparison. Pre-existing (the redesign was UI-only).
- **Ruling (2026-09-06):** fix it now — minimum viable quantity-aware version.
- **Fix (applied):**
  - `reconcileRecipe` now accepts `InventoryLot[]` (match tokens + `quantity` + `unit` + `typicalPieceGrams`) as well as the old `string[]`. When the recipe line and a matched lot both carry a quantity and a convertible unit, it compares: `have ≥ need` → `have`; `0 < have < need` → new **`short`** status; absent → `missing`. Unconvertible / no-quantity → falls back to name-presence (never a false "buy"). Multiple lots for one ingredient are summed. Result gains a `lines[]` breakdown with `have` / `shortBy` per ingredient; `available`/`missing`/`coverage` unchanged in meaning (short lines join `missing`).
  - `getRecipeWithReconciliation` passes lots built from live inventory (`quantity`, `unit`, `ingredient.typicalPieceGrams`).
  - `addRecipeMissing` writes `quantityNeeded = shortBy` for a `short` line (the `need − have` delta) and the full amount for a wholly-absent one — `max(0, need − have)` via the existing `convert()`.
  - `meals/[id]/page.tsx` badge: `have` / **`not enough`** (amber) / `to buy` — word + colour, not colour alone.
  - **Overuse surfaced:** `cookRecipe` and `consumeItem` now read `consumeInventoryItem`'s `overuse` flag and redirect with `?over=N`; `Toaster` shows "You used more than you had of N items — they're now at zero." (info tone). Previously the flag was swallowed.
- **Not changed (accepted):** the meals *list* card chip (`meals/page.tsx`) and `analyzeCookability` scoring stay name-only — they don't drive the shopping delta and threading lots there is scope beyond "minimum viable". Duplicate-merge on the shopping list is still skip-dedup (separate call — ISSUE-010, P3, not in this ruling).
- **Files changed:** `src/lib/recipe.ts`, `src/server/services/recipe.ts`, `src/server/services/shopping.ts`, `src/app/(app)/meals/[id]/page.tsx`, `src/app/(app)/meals/[id]/cook/actions.ts`, `src/app/(app)/inventory/actions.ts`, `src/components/ui/toaster.tsx`, `src/app/(app)/inventory/page.tsx` (Stage 3 — see §14 for commit)
- **Verified by:** `src/lib/qa-block-d.test.ts` — new `D · quantity-aware reconciliation (ISSUE-009)` block (7 specs: have 2/need 4 → short by 2; exact cover; g↔kg cross-unit short by 100; multi-lot sum; unconvertible → safe "have"; wholly absent → missing at full qty; optional+short not missing) + the integration spec now asserts the shopping delta ≈ 200 g. `recipe.test.ts` (13) unchanged and green — the `string[]` name-only path is preserved. Full suite **109/109**; typecheck + prod build exit 0. Runtime (DB) proof of `addRecipeMissing` still `NOT TESTED` — see §11.
- **Status:** FIXED

---

### ISSUE-010

- **Severity:** P3
- **Feature:** Shopping list — duplicate handling
- **Problem:** QA-PLAN §D expects duplicate items to **merge**. `addRecipeMissing` (`shopping.ts:60`) and `addManualItem` (`shopping.ts:31`) instead **skip** a `norm()`-equal row (`skipped++; continue`). Quantities are never summed, so adding the missing items of two recipes that both need onions yields one "onion" line at the first recipe's quantity, silently understating the shop. The client-side `shopping-list.tsx` also does no merging.
- **Root cause:** Dedup implemented as "skip if a same-label row exists" rather than "merge quantities".
- **Fix:** product ruling — merge (`quantityNeeded += detail.quantity` when units match; keep separate lines when they don't) vs. keep skip-dedup for v1. Small diff if merge is wanted and units are ignored; larger if unit reconciliation is required.
- **Files changed:** none
- **Verified by:** `qa-block-d.test.ts` "duplicate items are SKIPPED, not merged"; read `shopping.ts:24-43,49-78`.
- **Status:** OPEN

---

### ISSUE-011

- **Severity:** P3
- **Feature:** Expiry badge — "Expired" lags true expiry by up to 24 h
- **Problem:** `daysUntil` = `Math.ceil(msDiff / 86_400_000)` (`expiry.ts:137-140`). For an item that expired **less than 24 h ago**, `msDiff` is a small negative, `Math.ceil` yields `-0`, and `-0 < 0` is `false` — so `classifyStatus` returns `CRITICAL` ("Use now"), not `EXPIRED`. An item that went off at 23:00 still reads "Use now · today" until a full day passes. It is still red / high-priority, so it's not hidden — just mislabelled for <24 h. (Beyond 24 h past, it correctly reads `EXPIRED`.)
- **Root cause:** `Math.ceil` on a raw millisecond delta instead of a calendar-day comparison (whole-day floor of both dates, or `Math.floor` for the past side).
- **Fix (proposed, not applied):** compare calendar days (zero both dates to local midnight before differencing), or special-case `msDiff < 0 → Math.floor`. One-line change in `daysUntil`; would also fix ISSUE-012's future side. Needs a ruling because `daysUntil` feeds several surfaces — re-run `expiry.test.ts` + `qa-block-d.test.ts` after.
- **Files changed:** none
- **Verified by:** `qa-block-d.test.ts` "an item that expired <24h ago still reads CRITICAL" / "…>24h ago reads EXPIRED".
- **Status:** OPEN

---

### ISSUE-012

- **Severity:** P3 (label wording — plan vs. shipped copy)
- **Feature:** Expiry badge text
- **Problem:** QA-PLAN §D specifies these labels; the shipped badge (`expiry-badge.tsx:4-10,35` composing `classifyStatus` + `relativeLabel`) produces different strings:

  | Plan | Shipped badge |
  |---|---|
  | `Use now` (today) | `Use now · today` |
  | `Use tomorrow` (tomorrow) | `Use now · tomorrow` — CRITICAL covers d ≤ 1, no distinct "tomorrow" bucket |
  | `Use in 3 days` (+3d) | `Use soon · in 3 days` |
  | `Expired` (yesterday) | `Expired · today` — `relativeLabel` maps d = −1 to "today" |
  | `Expiry unknown` (null) | `No date` |

  Also: an item expiring **later the same day** already reads `… · tomorrow` (same `Math.ceil` root cause as ISSUE-011).
- **Root cause:** The badge shows `"<status word> · <relative phrase>"`; the plan assumed a single phrase. The buckets (`CRITICAL` = d ≤ 1) don't line up with the plan's per-day labels.
- **Fix:** **ruling required — code change vs. plan change.** If the plan's exact copy is wanted: add a "tomorrow" branch to the label map, drop the `· today` suffix for CRITICAL/EXPIRED, and change `UNKNOWN` copy to "Expiry unknown". If the shipped copy is acceptable, update QA-PLAN §D. No code touched pending the call.
- **Files changed:** none
- **Verified by:** `qa-block-d.test.ts` "D · expiry labels…" (7 tests assert the shipped strings, each flagged `[DELTA]`).
- **Status:** OPEN

---

### ISSUE-013

- **Severity:** P2 (data integrity under partial failure)
- **Feature:** Receipt review → commit to inventory
- **Problem:** `commitReceipt`'s per-item loop (`receipt.ts:153-190`) is **not wrapped in a transaction**. Each iteration does `createInventoryItem` → `receiptItem.update` → `ingredientAlias.upsert`. If any iteration throws (DB blip, the `@unique` `ReceiptItem.inventoryItemId` colliding, an alias race), the receipt stays `PARSED` (the `status: "COMMITTED"` write at `:192` never runs) while the items processed so far are already in inventory. Re-submitting the review then **re-creates** those inventory rows (no "already linked" guard), duplicating them and orphaning the earlier ones. Recon flagged this; confirmed by trace.
- **Root cause:** Multi-row write without a `$transaction`, and no idempotency check on `receiptItemId`s that already have an `inventoryItemId`.
- **Ruling (2026-09-06):** wrap the loop in `$transaction`.
- **Fix (applied):** the whole commit batch — every `createInventoryItem` + `receiptItem.update` + `ingredientAlias.upsert`, then the `status: "COMMITTED"` flip — now runs inside one `prisma.$transaction(async (tx) => …, { timeout: 20_000 })`. `createInventoryItem` gained an optional `db: Prisma.TransactionClient = prisma` param so its write joins the caller's tx (its reference-data *reads* stay on the base client — they don't need tx isolation). A mid-loop failure now rolls the entire commit back, so the receipt stays `PARSED` with **zero** inventory rows written and a retry starts clean — no half-commit, no duplication. The ISSUE-001 ownership guard still runs before the tx opens.
- **Files changed:** `src/server/services/receipt.ts`, `src/server/services/inventory.ts` (Stage 3 — see §14 for commit)
- **Verified by:** `npm run typecheck` → exit 0; `npm run build` → exit 0; full suite 109/109. Runtime repro (forced mid-loop failure) still `NOT TESTED` — see §11.
- **Status:** FIXED

---

### ISSUE-014

- **Severity:** P2 (deploy-config — receipt scanning breaks on a fresh env)
- **Feature:** AI provider selection
- **Problem:** Three sources disagree on the default AI provider:
  - `provider.ts:89` — `(process.env.AI_PROVIDER ?? "gemini")` → code default is **gemini**.
  - `.env.example:33` — `AI_PROVIDER="anthropic"` and documents **only** `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`.
  - `env.ts:8-19` — schema validates **only** `ANTHROPIC_*`; there is no `GEMINI_API_KEY` / `GEMINI_MODEL`.

  `GeminiProvider`'s constructor reads `process.env.GEMINI_API_KEY` directly and `throw`s `"GEMINI_API_KEY is not set."` if absent (`gemini-provider.ts:24-25`). So a deploy that copies `.env.example` and *doesn't* explicitly set `AI_PROVIDER` gets the gemini code path with an undocumented, unvalidated, missing key → every receipt scan throws, and the raw message reaches the user (ISSUE-008).
- **Root cause:** The code default (gemini) was changed without updating `.env.example` or `env.ts`.
- **Ruling (2026-09-06):** standardise on **gemini** (the user has an active Gemini API token).
- **Fix (applied):** all three sources now agree on gemini.
  - `env.ts` schema adds `GEMINI_API_KEY` and `GEMINI_MODEL` (both `.optional()`, same as the `ANTHROPIC_*` pair) with a comment that `AI_PROVIDER` defaults to `"gemini"`.
  - `.env.example` M2 block rewritten: `AI_PROVIDER="gemini"` first, then a documented Gemini block (`GEMINI_API_KEY`, `GEMINI_MODEL` default `gemini-2.5-flash`, AI Studio link) and the Anthropic block kept as the labelled alternative.
  - `provider.ts` header comment corrected ("the default is Gemini"); the `?? "gemini"` fallback at `provider.ts:89` was already correct and is unchanged.
- **Still a deploy step:** `GEMINI_API_KEY` must be set in the production environment — it's `.optional()` in the schema (so the app boots without it) and `GeminiProvider`'s constructor throws a clean `"GEMINI_API_KEY is not set."` if absent. Added to §13.
- **Files changed:** `src/lib/env.ts`, `.env.example`, `src/server/ai/provider.ts` (Stage 3 — see §14 for commit)
- **Verified by:** `npm run typecheck` → exit 0; `npm run build` → exit 0 (env schema parses); full suite 109/109.
- **Status:** FIXED

---

## 8. Security Findings

_Secrets exposure, missing auth/authz checks, RLS bypass, unsafe uploads, unsafe queries._

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| S1 | **Receipt-commit write IDOR** — `commitReceipt` updated `receipt_items` by a client-supplied id without checking it belonged to the verified receipt; Prisma bypasses RLS so this was the only guard. See ISSUE-001. | P1 | **FIXED** (`04e3fe7`) |
| S2 | Global `ingredient_aliases` table is trained directly from one user's receipt input and applied to all users. See ISSUE-005. | P3 | OPEN (needs product ruling) |
| S3 | No `Content-Security-Policy` header (`next.config.mjs` sets HSTS/XFO/nosniff/Referrer-Policy/Permissions-Policy only). Recon note; belongs to Block F. | P3 | OPEN |
| S4 | `public/QA-PLAN.md`, `public/QA-REPORT.md`, `public/CLAUDE-CODE-PROMPTS.md`, `public/Kitchen OS Mobile.dc.html` are served at `/<name>` in production (info disclosure). Belongs to Block F. | P3 | OPEN |
| S5 | Receipt-scan surfaces raw AI/Storage error strings (`e.message`, `upErr.message`) to the client. Provider/config/rate-limit disclosure, no key value. See ISSUE-008. | P3 | OPEN |
| S6 | Receipt image is uploaded to Storage (`receipt.ts:48`) **before** any file-type check; type validation is per-provider (`gemini-provider.ts:31`, `anthropic-provider.ts:29`) and runs only at parse time. A rejected upload leaves an orphan object in the user's Storage folder. `file.type` is client-set and never re-checked server-side. Low risk (object is private, signed-URL only). | P3 | OPEN |
| — | **No** service-role key anywhere in `src` (`grep -rn service_role/SERVICE_ROLE` → nothing); all Supabase clients use the anon key + cookies. | — | PASS |
| — | **Client-bundle secret grep — DONE, CLEAN.** `grep -rlE "sk-ant-\|AIza…\|SERVICE_ROLE\|ANTHROPIC_API_KEY\|GEMINI_API_KEY\|DATABASE_URL\|DIRECT_URL\|eyJ…" .next/static` → no matches (exit 1) on a clean prod build; supabase client code confirmed present (sanity grep hits). | — | PASS |

**Auth/authz posture (verified clean, Block C):** JWT re-verified in middleware *and* `(app)/layout.tsx`; every server action derives `userId` from `auth.getUser()` (never the client); every service query is `userId`-scoped; RLS + Storage policies are live on the DB as defence-in-depth. Middleware is **not** relied on as the security boundary (correct — Next docs).

---

## 9. Database / RLS Findings

_A→B reachability is stated for the **browser anon/`authenticated` client** path (the only path RLS governs). The Prisma/service path bypasses RLS and is instead gated by `userId`-scoped queries in `src/server/services/*` — audited clean in Block C (C3), with the one exception fixed in ISSUE-001._
_Live check 2026-09-06: `rowsecurity = ON` on all 18 tables; every `rls.sql` policy present with matching `USING`/`WITH CHECK`._

| Table | A can reach B's rows? | Policy (live, from `pg_policies`) | Notes |
|-------|----------------------|----------------------------------|-------|
| inventory_items | No | `own - all` FOR ALL — `USING (auth.uid() = user_id)` / `WITH CHECK (auth.uid() = user_id)` | Prisma path also scoped by `userId` in every `inventory.ts` fn. |
| receipts | No | `own - all` FOR ALL — `auth.uid() = user_id` (USING + CHECK) | `@@unique([userId, imageHash])` for dedup. |
| receipt_items | No (client) | `own via receipt` FOR ALL — `EXISTS (SELECT 1 FROM receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid())` | Prisma path had the ISSUE-001 write-IDOR — **fixed**. |
| recipes | Read-only for global rows | `own or global - select` — `USING (user_id IS NULL OR auth.uid() = user_id)`; `own - write` FOR ALL — `auth.uid() = user_id` (USING + CHECK) | `user_id IS NULL` = intentional global/system recipes, world-readable to authenticated. No user rows currently global (8 recipes, all owned). |
| recipe_ingredients | No (own or global parent) | `own via recipe` FOR ALL — `EXISTS (… recipes r WHERE r.id = recipe_id AND (r.user_id = auth.uid() OR r.user_id IS NULL))` | Mirrors the recipe read rule. |
| meal_plans | No | `own - all` FOR ALL — `auth.uid() = user_id` (USING + CHECK) | |
| meal_plan_items | No | `own via plan` FOR ALL — `EXISTS (… meal_plans m WHERE m.id = meal_plan_id AND m.user_id = auth.uid())` | Recipe ref can be nulled by ISSUE-002. |
| shopping_lists | No | `own - all` FOR ALL — `auth.uid() = user_id` (USING + CHECK) | No `@@unique([userId])` — see ISSUE-006. |
| shopping_list_items | No | `own via list` FOR ALL — `EXISTS (… shopping_lists s WHERE s.id = shopping_list_id AND s.user_id = auth.uid())` | |
| consumption_records | No | `own via item` FOR ALL — `EXISTS (… inventory_items i WHERE i.id = inventory_item_id AND i.user_id = auth.uid())` | |
| profiles | No | `own profile - select` / `own profile - update` — `auth.uid() = id` | No client INSERT/DELETE policy; insert via `SECURITY DEFINER` trigger `on_auth_user_created` (verified enabled). |
| user_preferences | No | `own - all` FOR ALL — `auth.uid() = user_id` (USING + CHECK) | Accessibility toggles live in `notification_thresholds` JSON. |
| categories / ingredients / ingredient_aliases / shelf_life_rules / unit_conversions | Read-only, all authenticated users | `read reference` FOR SELECT — `auth.role() = 'authenticated'` | Reference data; no client write policy. `ingredient_aliases` is written server-side from user input — see ISSUE-005. |
| storage.objects (bucket `receipts`) | No | 4 policies (`select`/`insert`/`update`/`delete`), each `bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text` | Bucket `public = false`; images via 10-min signed URLs. |

**Caveat:** `relforcerowsecurity = false` on every table, so the Prisma connection role (table owner / privileged) bypasses RLS **by design** — this is the documented model (`rls.sql` header). RLS only protects the anon/`authenticated` roles. Live cross-user proof via two real users + the browser anon client is **NOT TESTED** (see §11) — the above is a full static read of live policy definitions, which is sufficient to show each policy is present and correctly shaped.

---

## 10. Core Logic Test Results

All specs in `src/lib/qa-block-d.test.ts` (**33 tests**, green — 28 Stage-2 + 5 net new for the ISSUE-009 fix). Full suite: **109/109**. `Result` = does behaviour meet the QA-PLAN §D expectation, **after the Stage 3 rulings** (§7 / §14).

| Case | Plan expected | Actual (after Stage 3) | Result |
|------|----------|--------|--------|
| 500g − 300g | 200g | 200g | ✅ PASS |
| Consume exact remaining | 0, no error | `newQuantity: 0`, `usedUp: true`, `ok: true` | ✅ PASS |
| Consume more than available | rejected/clamped, never negative | clamped to `0`, `overuse: true`, `newQuantity ≥ 0`; **`cookRecipe`/`consumeItem` now surface `overuse` via a `?over=N` toast** (ISSUE-009 ruling) | ✅ PASS (clamped, safe, and now warned) |
| Unit mismatch (g/kg/pack) | defined behavior, no silent corruption | `g↔kg` converts; `pcs`/`pack` vs `g` w/o piece weight → `{ok:false}`; `ml` vs `g` → `{ok:false}` | ✅ PASS |
| Expiry: today | "Use now" | badge `Use now · today` | ⚠️ DELTA — ISSUE-012 (accepted, P3) |
| Expiry: tomorrow | "Use tomorrow" | badge `Use now · tomorrow` (no distinct bucket) | ⚠️ DELTA — ISSUE-012 (accepted, P3) |
| Expiry: +3 days | "Use in 3 days" | badge `Use soon · in 3 days` | ⚠️ DELTA — ISSUE-012 (accepted, P3) |
| Expiry: yesterday | "Expired" | badge `Expired · today` | ⚠️ DELTA — ISSUE-012 (accepted, P3) |
| Expiry: null | "Expiry unknown" | badge `No date` | ⚠️ DELTA — ISSUE-012 (accepted, P3) |
| Expiry across TZ boundary | no ±1 day drift | pure fn is instant-based — 23:30→01:00-next-day stays CRITICAL, no early flip ✅. Item expired <24h ago still reads CRITICAL not EXPIRED (`Math.ceil`→`-0`) | ⚠️ partial — future side ✅, past side lags — ISSUE-011 (accepted, P3). Prisma round-trip still `NOT TESTED` (§11) |
| Estimated vs confirmed expiry | distinguishable (visual + structural) | `source` enum column (`ESTIMATED`/`EXACT`) + textual `est.` marker on the badge (word, not colour) | ✅ PASS |
| Recipe availability accuracy | never claims a missing item is available | quantity-aware: `have ≥ need` → `have`; `0 < have < need` → `short` (badge "not enough", joins `missing`); absent → `missing`. Unconvertible/no-qty → safe name-presence fallback | ✅ PASS — ISSUE-009 FIXED |
| Shopping list: have 2, need 4 | buy 2 | `short` line, `shortBy = 2` → `addRecipeMissing` writes `quantityNeeded = 2` (the `need − have` delta via `convert()`) | ✅ PASS — ISSUE-009 FIXED |
| Duplicate shopping items | merged | `norm()`-equal row → **skipped**, quantities never summed | ❌ DELTA — ISSUE-010 (accepted for v1, P3) |
| Integration: cook recipe | 200g / 800g / 100g | 200 / 800 / 100 (chained `computeDeduction`) | ✅ PASS |
| Integration: next recipe needs 400g chicken | buy ~200g | 200 g in stock < 400 g needed → `short`, `shortBy = 200` → list recommends 200 g | ✅ PASS — ISSUE-009 FIXED |

**Runtime integration (real Prisma + Postgres):** still `NOT TESTED` — no integration harness exists (§3). The reconciliation specs run the real pure `reconcileRecipe`; the `addRecipeMissing` DB write is traced, not executed. See §11.

---

## 11. Not Tested

_Everything unverified, and what it would take to verify it._

| Area | Why not tested | What's needed |
|------|---------------|---------------|
| Lint | No ESLint config or `eslint` dependency in the project; `npm` has no `lint` script. `next build`'s "Linting" step is a no-op (Next skips it with no config installed). The 5 `eslint-disable` comments in the code are therefore inert. | Add `eslint` + `eslint-config-next` and a `lint` script if lint coverage is wanted; out of QA scope to introduce. |
| RLS cross-user proof (live) | Requires two real Supabase users and the browser anon client to actually attempt A→B reads/writes. Static read of every live policy done instead (§9). | A Supabase project with `rls.sql` + `storage.sql` applied (confirmed applied) + 2 test users + a script using `@supabase/supabase-js` with each user's JWT. |
| ISSUE-001 live exploit + fix confirmation | Same as above — needs a forged `commitReceiptAction` payload from an authenticated session. | Running app + 2 users; POST the action with another user's `receiptItemId`. Expect `"Those items don't belong to this receipt."` |
| ISSUE-002 runtime repro | **Fixed in code** (`NOT: { mealPlanItems: { some: {} } }` guard); the before/after runtime repro needs AI-generated recipes + a saved meal plan. | `GEMINI_API_KEY` + Storage; generate suggestions, make a plan, regenerate suggestions, check `getLatestPlan` items still have their `recipe`. |
| ISSUE-003 `/api/health` behaviour | Needs the running server. | `curl -i http://localhost:3000/api/health` unauthenticated → observe 307 vs 200. |
| Middleware route-protection behaviour | Static read done; live request behaviour (matcher gaps, redirect chains, expired session) not exercised. | Running app + Supabase auth; `curl`/browser against protected + public paths, and with a stale cookie. |
| Auth flows (signup, login, logout, session persistence, expired-session, redirects) | Not verifiable from code alone; no Playwright configured. | Supabase project + a browser pass (or scripted auth via `@supabase/supabase-js`). |
| Timezone round-trip (±1-day expiry flip) | `DateTime` columns are `timestamp(3)` (no tz); `classifyStatus` uses local `new Date()`. The pure-function boundary case is a Block D test; the Prisma round-trip needs a DB write/read under a non-UTC `TZ`. | Block D: crafted-UTC-`Date` unit tests (runnable now). Full round-trip: a test DB + `TZ` env manipulation. |
| Decimal/FP quantity accumulation | ~~Not yet exercised.~~ **DONE** — `qa-block-d.test.ts` covers `0.3kg − 100g = 0.2kg` through `computeDeduction` (no drift, `tidy` 3dp). | — |
| Client-bundle secret grep | ~~Not yet run.~~ **DONE, CLEAN** — `grep -rlE "sk-ant-\|AIza…\|SERVICE_ROLE\|*_API_KEY\|DATABASE_URL\|DIRECT_URL\|eyJ…" .next/static` → no matches; supabase client code present. See §6 F1, §8. | — |
| AI provider key mismatch | **FIXED — ISSUE-014.** All three sources now agree on gemini (`env.ts` gains `GEMINI_API_KEY`/`GEMINI_MODEL`; `.env.example` M2 block rewritten; `provider.ts` comment fixed). Not exercised at runtime. | Set `GEMINI_API_KEY` in the deploy env; one live receipt scan with a real key to confirm end to end. |
| Receipt pipeline end-to-end (upload → Storage → AI → parse → commit) | Static trace done (§6 E1–E4); no live run — needs an AI key + Storage. | `AI_PROVIDER` key (gemini or anthropic) + Supabase Storage; upload a real receipt, confirm PARSED items, edit one, commit, verify the inventory row reflects the edit. |
| ISSUE-013 partial-commit repro | **Fixed in code** (whole commit batch now in one `prisma.$transaction`). Proving the rollback needs a forced mid-loop failure. | Test DB + a crafted payload, or a fault-injected Prisma; assert 0 inventory rows + receipt still `PARSED` after the induced throw. |
| Browser a11y / responsive / interaction pass | No Playwright configured (QA-PLAN §G says do not fake this by reading CSS). Static a11y wiring verified (§6 G5). | A Playwright pass: 375px + 200% zoom on dashboard/inventory/forms/sheets; keyboard tab order + sheet focus trap; 44px hit-targets on `BottomNav`/`PrimaryAction`/chips/steppers/switches; `prefers-reduced-motion` + the `data-reduce-motion` toggle; confirm no status is colour-only in a real render. |
| Blocks D, E, F, G | **DONE this session** (static + Vitest). Runtime/browser portions remain per the rows above. | — |

---

## 12. Production Build

- **Result:** PASS
- **Command:** `npm run build` (`prisma generate && next build`), Next.js 15.5.23. Run on `c18eca3` (baseline), `04e3fe7` (after ISSUE-001 fix), Stage 2 D–G session, Stage 3 final verification (`0d19f92`), and **again after the four P2 fixes** (§14) — all green. `npm run typecheck` (`tsc --noEmit`) → exit 0 each time.
- **Output summary (post-P2-fix run):** `✓ Compiled successfully in 4.4s`, `✓ Generating static pages (18/18)`. 22 route entries: `/`, `/_not-found`, `/login`, `/robots.txt` static (○); the other 18 server-rendered on demand (ƒ). Shared JS 103 kB; largest route bundle `/scan/[id]/review` 6.38 kB. No `EPERM` from `prisma generate`. Lint step is a no-op (no ESLint installed — §11).
- **Test suite (post-P2-fix run):** `npx vitest run` → **109 passed (9 files)** — 76 pre-existing + 33 Block-D specs (28 Stage-2 + 5 net new for ISSUE-009).

---

## 13. Top Actions Before Deploy

**No P0, P1, or P2 is open.** ISSUE-001 (P1) fixed in `04e3fe7`; ISSUE-002 / 009 / 013 / 014 (P2) fixed in Stage 3 (§14). What's left is deploy config, live confirmation of code-verified fixes, and a P3 batch.

1. **Set `GEMINI_API_KEY` in the production environment** (ISSUE-014). It's `.optional()` in `env.ts` so the app boots without it, but every receipt scan throws `"GEMINI_API_KEY is not set."` until it's present. Also set `NEXT_PUBLIC_SITE_URL` (ISSUE-007) and confirm `rls.sql` + `storage.sql` are applied on the deploy DB.
2. **Confirm the code-verified fixes on a live stack** (all currently `NOT TESTED` at runtime — §11):
   - ISSUE-001 — cross-user `commitReceiptAction` with a foreign `receiptItemId` → expect `"Those items don't belong to this receipt."`
   - ISSUE-002 — make a meal plan, regenerate dinner suggestions, confirm the plan's recipes survive.
   - ISSUE-009 — inventory tomato ×2, cook/plan a recipe needing 4 → shopping list shows **2**.
   - ISSUE-013 — induce a mid-commit failure → 0 inventory rows, receipt still `PARSED`, clean retry.
3. **Browser a11y / responsive pass** (Playwright not configured — §11). Includes confirming the new `meals/[id]` badge ("have" / "not enough" / "to buy") and the `?over` toast read correctly, and that "not enough" is distinguishable without colour (it is — distinct word).
4. **P3 cleanup batch (non-blocking):** ISSUE-003 (`/api/health` behind auth, one line), ISSUE-008 (map receipt error strings to a generic message), ISSUE-011/012 (expiry label lag + wording — accepted as-is this pass; revisit if copy matters), ISSUE-010 (shopping dedup: merge vs skip — accepted skip for v1), ISSUE-005 (global alias table), S3 (CSP header), S4 (`public/*.md` + `.dc.html` served in prod — see the note in §14).

---

## 14. Stage 3 — Final Verification (2026-09-06)

Two parts: (14a) the plan's re-verification pass on the branch tip as it stood after Stage 2, then (14b) the four P2 fixes the user ruled on, applied and re-verified.

---

### 14a — Re-verification (2026-09-06, on `0d19f92`)

Re-ran every gate on the branch tip, working tree clean. No new code in this part.

### Re-run results

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | **exit 0**, no output |
| Production build | `npm run build` (`prisma generate && next build`) | **exit 0** — `✓ Compiled successfully in 3.0s`, `✓ Generating static pages (18/18)`, 22 routes, shared JS 103 kB, no `EPERM` |
| Full test suite | `npx vitest run` | **104 passed / 9 files** (exit 0) |
| Block D specs (isolated) | `npx vitest run src/lib/qa-block-d.test.ts --reporter=verbose` | **28 passed** (exit 0) — 12 pass clean, 8 carry an explicit `[DELTA]` flag documenting a plan-vs-shipped gap (ISSUE-009/010/011/012), all asserting *current* behaviour so a future fix trips the spec |
| Lint | — | No ESLint config or dependency exists; `next build` lint step is a no-op. Unchanged from Stage 2 (§11). |

### Regression check

The entire QA pass changed **exactly one block of production code**: the ISSUE-001 fix in `src/server/services/receipt.ts` (`04e3fe7`, +10 lines). `git diff --stat c18eca3..HEAD -- 'src/**'` outside test files shows only `receipt.ts | 10 ++`.

- The fix is an **additive pre-loop ownership guard** — it loads the verified receipt's own `receipt_items` id set and rejects the request if any reviewed line's `receiptItemId` isn't in it. For a legitimate review submission every id belongs to that receipt, so the guard is a no-op on the happy path; no behaviour change, no data-shape change.
- Typecheck, production build, and the full 104-spec suite (which includes `schemas.test.ts` covering `reviewedItemsSchema` and the receipt validation path) all pass with the guard in place.
- No other production file was touched, so there is nothing else for a fix to have regressed. **No regression.**

### 14a verdict (before the P2 fixes)

- Hard gate satisfied: build passes, no P0, the one P1 (ISSUE-001) fixed.
- Not READY: 4 P2s open pending a ruling from the user (ISSUE-002/009/013/014).

---

### 14b — P2 rulings applied (2026-09-06)

The user ruled on all four P2s; each fix was applied with the smallest reasonable diff and re-verified.

| Issue | Ruling | What changed |
|-------|--------|--------------|
| **ISSUE-014** (P2) | Standardise on **gemini** | `env.ts` +`GEMINI_API_KEY`/`GEMINI_MODEL`; `.env.example` M2 block rewritten (gemini default + documented, anthropic kept as alt); `provider.ts` comment fixed. Fallback was already `"gemini"`. |
| **ISSUE-013** (P2) | Wrap the commit loop in `$transaction` | `commitReceipt`'s whole batch (items + links + alias upserts + `COMMITTED` flip) runs in one `prisma.$transaction(…, { timeout: 20_000 })`. `createInventoryItem` gained `db: Prisma.TransactionClient = prisma` so its write joins the tx. Mid-loop failure now rolls everything back — no half-commit, no retry duplication. |
| **ISSUE-002** (P2) | Add the `mealPlanItems` guard | `generateSuggestions`' prune `deleteMany` now carries `NOT: { mealPlanItems: { some: {} } }` — a recipe any meal plan points at is never pruned. |
| **ISSUE-009** (P2) | Fix now — minimum viable quantity-aware version | `reconcileRecipe` takes `InventoryLot[]` (tokens + qty + unit + `typicalPieceGrams`), compares amounts via the existing `convert()`, adds a `short` status + per-line `have`/`shortBy`. `getRecipeWithReconciliation` passes real lots. `addRecipeMissing` writes `max(0, need − have)`. `meals/[id]` badge → have / **not enough** / to buy. `cookRecipe` + `consumeItem` now **surface `overuse`** via a `?over=N` toast instead of swallowing it. Name-only `string[]` path preserved for other callers. |

**Files changed (14b):** `src/lib/recipe.ts`, `src/lib/env.ts`, `src/lib/qa-block-d.test.ts`, `src/server/ai/provider.ts`, `src/server/services/recipe.ts`, `src/server/services/inventory.ts`, `src/server/services/receipt.ts`, `src/server/services/shopping.ts`, `src/app/(app)/meals/[id]/page.tsx`, `src/app/(app)/meals/[id]/cook/actions.ts`, `src/app/(app)/inventory/actions.ts`, `src/app/(app)/inventory/page.tsx`, `src/components/ui/toaster.tsx`, `.env.example`.

**Re-verification (14b):**

| Check | Result |
|-------|--------|
| `npm run typecheck` | **exit 0** |
| `npm run build` | **exit 0** — `✓ Compiled successfully in 4.4s`, 18/18 static pages, 22 routes |
| `npx vitest run` | **109 passed / 9 files** (was 104; +7 new quantity-aware specs, −2 obsolete "KNOWN GAP" specs) |

**Regression check (14b):** `reconcileRecipe`'s signature widened to `string[] | InventoryLot[]`; every existing caller that passed `string[]` (`recipe.test.ts` ×13, `meals/page.tsx` card chip, `qa-block-d` name-only specs) still gets identical name-presence behaviour — verified green. `createInventoryItem`'s new `db` param defaults to `prisma`, so its existing callers (`addInventoryItem`, `editInventoryItem` via `updateInventoryItem`, manual add) are unaffected. `ReconcileResult` only *gained* a field (`lines`). No behaviour change outside the four issues. Full suite + typecheck + build all green.

### Final verdict

- **Hard gate satisfied:** production build passes; **no P0, P1, or P2 open**.
- **READY for deploy per the QA-PLAN gate**, with two caveats that are the user's call, not blockers:
  1. `GEMINI_API_KEY` (+ `NEXT_PUBLIC_SITE_URL`, + `rls.sql`/`storage.sql` applied) must be set on the deploy target — §13 item 1.
  2. The browser a11y / responsive pass and the live confirmation of the four code-verified fixes (§13 items 2–3) still haven't run — no Playwright, no live stack in this environment.
- P3 batch (§13 item 4) is non-blocking and can follow the deploy.

### Note — `public/*.md` deletion during the session

Partway through 14b, `git status` showed `public/QA-PLAN.md`, `public/QA-REPORT.md`, and `public/CLAUDE-CODE-PROMPTS.md` as **deleted from the working tree** (dir mtime moved to 08:14; `Kitchen OS Mobile.dc.html` untouched). Nothing in this session ran a delete — cause unknown (OneDrive sync on the `OneDrive/Desktop` path is the leading guess). All three were restored with `git checkout --` before any commit, so no fix commit carries the deletion and the files are intact. Flagged here because it's unexplained; **S4 still stands** — these files (and the `.dc.html`) are served at `/<name>` in production and should be moved out of `public/` regardless.
