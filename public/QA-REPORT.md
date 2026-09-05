# Kitchen OS — QA Report

> Working document. Claude Code appends to this across sessions so findings survive
> context resets. Every `PASS` must cite a `file:line`, a command's output, or a test
> result. Anything unverified goes under **Not Tested** — never under Passed.

**Branch:** `qa/pre-deploy` — CREATED off `main`. The ~30 uncommitted redesign files were snapshotted first as `c18eca3 chore(qa): baseline uncommitted redesign WIP before QA pass` so QA fixes produce a clean diff. Deploy target = this branch. Local git identity set to `mark.cabelloit@gmail.com` (repo had none).
**Started:** 2026-09-06 (Stage 1)
**Last updated:** 2026-09-06 — Stage 2 blocks A, B, C complete (1 P1 fixed)

---

## Overall Status

`IN PROGRESS` — Stage 2 A–C done. Static health green (typecheck + prod build pass; no lint tooling exists). Data layer: schema ↔ migrations ↔ live DB all consistent, no drift. Auth/isolation: service layer scopes every query by server-derived `userId`; RLS + Storage policies fully applied on the live DB. **1 P1 found and fixed** (receipt-commit write IDOR). 2 P2 and several P3 open — see Issues. Blocks D–G not yet run.

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
- **Fix (proposed, not yet applied):** Exclude ids referenced by `meal_plan_items` (and optionally `consumption_records`) from the `deleteMany`, e.g. add `AND id NOT IN (SELECT recipe_id FROM meal_plan_items WHERE recipe_id IS NOT NULL)` via a Prisma `NOT: { mealPlanItems: { some: {} } }` relation filter. Needs a ruling: this is pre-existing service logic (the redesign was UI-only), and "smallest diff" vs. a broader "don't delete referenced recipes" cleanup.
- **Files changed:** none yet
- **Verified by:** code + schema read (`recipe.ts:82-165,318-392`, `schema.prisma:293,340-344,387,393`); reproduction is deterministic from the code path. Runtime repro `NOT TESTED` (needs AI key to generate recipes + a plan).
- **Status:** OPEN

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

## 8. Security Findings

_Secrets exposure, missing auth/authz checks, RLS bypass, unsafe uploads, unsafe queries._

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| S1 | **Receipt-commit write IDOR** — `commitReceipt` updated `receipt_items` by a client-supplied id without checking it belonged to the verified receipt; Prisma bypasses RLS so this was the only guard. See ISSUE-001. | P1 | **FIXED** (`04e3fe7`) |
| S2 | Global `ingredient_aliases` table is trained directly from one user's receipt input and applied to all users. See ISSUE-005. | P3 | OPEN (needs product ruling) |
| S3 | No `Content-Security-Policy` header (`next.config.mjs` sets HSTS/XFO/nosniff/Referrer-Policy/Permissions-Policy only). Recon note; belongs to Block F. | P3 | OPEN |
| S4 | `public/QA-PLAN.md`, `public/QA-REPORT.md`, `public/CLAUDE-CODE-PROMPTS.md`, `public/Kitchen OS Mobile.dc.html` are served at `/<name>` in production (info disclosure). Belongs to Block F. | P3 | OPEN |
| — | **No** service-role key anywhere in `src` (`grep -rn service_role/SERVICE_ROLE` → nothing); all Supabase clients use the anon key + cookies. | — | PASS |
| — | Client-bundle secret grep (`.next/static`) not yet run — Block F. | — | NOT TESTED |

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
| Lint | No ESLint config or `eslint` dependency in the project; `npm` has no `lint` script. `next build`'s "Linting" step is a no-op (Next skips it with no config installed). The 5 `eslint-disable` comments in the code are therefore inert. | Add `eslint` + `eslint-config-next` and a `lint` script if lint coverage is wanted; out of QA scope to introduce. |
| RLS cross-user proof (live) | Requires two real Supabase users and the browser anon client to actually attempt A→B reads/writes. Static read of every live policy done instead (§9). | A Supabase project with `rls.sql` + `storage.sql` applied (confirmed applied) + 2 test users + a script using `@supabase/supabase-js` with each user's JWT. |
| ISSUE-001 live exploit + fix confirmation | Same as above — needs a forged `commitReceiptAction` payload from an authenticated session. | Running app + 2 users; POST the action with another user's `receiptItemId`. Expect `"Those items don't belong to this receipt."` |
| ISSUE-002 runtime repro | Needs AI-generated recipes and a saved meal plan to exist. | `AI_PROVIDER` key (gemini or anthropic) + Storage; generate suggestions, make a plan, regenerate suggestions, check `getLatestPlan` items for `recipe: null`. |
| ISSUE-003 `/api/health` behaviour | Needs the running server. | `curl -i http://localhost:3000/api/health` unauthenticated → observe 307 vs 200. |
| Middleware route-protection behaviour | Static read done; live request behaviour (matcher gaps, redirect chains, expired session) not exercised. | Running app + Supabase auth; `curl`/browser against protected + public paths, and with a stale cookie. |
| Auth flows (signup, login, logout, session persistence, expired-session, redirects) | Not verifiable from code alone; no Playwright configured. | Supabase project + a browser pass (or scripted auth via `@supabase/supabase-js`). |
| Timezone round-trip (±1-day expiry flip) | `DateTime` columns are `timestamp(3)` (no tz); `classifyStatus` uses local `new Date()`. The pure-function boundary case is a Block D test; the Prisma round-trip needs a DB write/read under a non-UTC `TZ`. | Block D: crafted-UTC-`Date` unit tests (runnable now). Full round-trip: a test DB + `TZ` env manipulation. |
| Decimal/FP quantity accumulation | `quantity` fields are `Float` (Postgres `double precision`); `tidy()` rounds to 3dp. Not yet exercised with `0.1 + 0.2`-style cases. | Block D Vitest against `computeDeduction` / `tidy` (runnable now). |
| Client-bundle secret grep | Build output exists but `.next/static` not yet grepped for secrets. | Block F: `grep -rE "SUPABASE|ANTHROPIC|GEMINI|sk-|API_KEY" .next/static`. |
| AI provider key mismatch | `AI_PROVIDER` defaults to `gemini` (`provider.ts`) but `env.ts` only declares `ANTHROPIC_*` — no `GEMINI_API_KEY`/`GOOGLE_API_KEY`. Not exercised. | Block E/F: confirm which provider deploy will use and that its key is in the env schema + `.env`. |
| Everything in Blocks D, E, F, G | Not started (this session was A–C only). | Per QA-PLAN Stage 2 D–G. |

---

## 12. Production Build

- **Result:** PASS
- **Command:** `npm run build` (`prisma generate && next build`), Next.js 15.5.23. Run twice: on the baseline `c18eca3` and again on `04e3fe7` **after** the ISSUE-001 fix — both green. `npm run typecheck` (`tsc --noEmit`) → exit 0 both times.
- **Output summary:** `✓ Compiled successfully`, `✓ Generating static pages (18/18)`, `✓ Collecting build traces`. 18 routes: `/`, `/login`, `/robots.txt`, `/_not-found` static; the rest server-rendered on demand. Shared JS ≈ 103 kB; largest route bundle `/scan/[id]/review` at 6.38 kB. No `EPERM` from `prisma generate`. No warnings other than the Prisma 6.2.1→8 update notice. Lint step is a no-op (no ESLint installed — see §11).

---

## 13. Top 5 Actions Before Deploy

1. **Confirm ISSUE-001 fix in a live 2-user test** (P1). The write-IDOR is fixed in code (`04e3fe7`) and typechecks, but a real cross-user `commitReceiptAction` exploit attempt was not run — do it before deploy.
2. **Decide ISSUE-002** (P2): regenerating dinner suggestions hard-deletes recipes referenced by an existing meal plan (and nulls consumption-record recipe links). Apply the proposed `deleteMany` guard or make an explicit product call to accept it.
3. **Fix ISSUE-003** (P3, one line): exclude `/api/health` from the auth redirect in `src/lib/supabase/middleware.ts` so readiness probes get `200`, not a redirect to `/login`.
4. **Verify deploy env** (ISSUE-007 + AI provider): set `NEXT_PUBLIC_SITE_URL` in production (email confirmation links); confirm whether `AI_PROVIDER` will be `gemini` or `anthropic` and that the matching key is in `env.ts` + the deploy env — `env.ts` currently declares only `ANTHROPIC_*`.
5. **Run Blocks D–G** before calling READY: core-logic Vitest specs (quantity/expiry/reconciliation/shopping-delta + the TZ boundary case), receipt-pipeline failure paths, client-bundle secret grep, CSP header decision, `public/*.md` exposure, and the browser a11y/responsive pass.
