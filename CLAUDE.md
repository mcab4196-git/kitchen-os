# Kitchen OS — guide for Claude

Kitchen inventory, expiry tracking and AI meal planning to cut food waste. A mobile-first PWA, free, for public
users in the Philippines (PHP, English UI). v1.0.0 (Sep 2026). Product truth: [PRODUCT.md](PRODUCT.md).
Upstream: `github.com/mcab4196-git/kitchen-os` (`main`). Roadmap: [PLAN.md](PLAN.md). Findings: [REVIEW.md](REVIEW.md).
PLAN.md and REVIEW.md are local-only (git-ignored): the repo is public and they list open security items. Don't
commit them, and don't copy their open findings into tracked files or commit messages.
Because users are public, one user's data or corrections must never change what another user sees.

## Stack

Next.js 15.5 (App Router, Server Actions) · React 19 · TypeScript strict · Tailwind 3 (CSS-variable tokens) ·
Prisma 6 → Supabase Postgres (PgBouncer) · Supabase Auth + Storage · Vitest 2 ·
AI behind one interface: Gemini (default) or Anthropic, chosen by `AI_PROVIDER`.

## Commands

```bash
npm run dev          # local app (needs .env — copy .env.example)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint, zero warnings allowed (CI runs typecheck · lint · test · build on every PR)
npm test             # vitest, pure logic only, no DB needed
npm run build        # prisma generate && next build
npm run db:migrate   # prisma migrate dev (uses DIRECT_URL, port 5432)
npm run db:rls       # apply prisma/rls.sql (prisma db execute; one transaction, safe to re-run) — after adding tables
npm run db:seed      # reference data (idempotent)
```

Baseline you must not break: **180 tests / 15 files green, typecheck and lint clean.** Run all three before finishing
any change.

If npm scripts fail with "'vitest' is not recognized", `node_modules/.bin` is missing (seen in the OneDrive copy).
Run `npm ci`, or call the tools directly:
`node node_modules/vitest/vitest.mjs run` · `node node_modules/typescript/bin/tsc --noEmit`.

## Layout

```
middleware.ts                 session refresh + route guard (src/lib/supabase/middleware.ts)
design/                       design mocks (kept out of public/, rule 8)
prisma/                       schema, migrations, rls.sql, storage.sql, seed.ts
src/app/(auth)/login          sign in / up / out actions
src/app/(app)/<feature>/      page.tsx + actions.ts ("use server") + client forms
src/app/auth/callback         email-confirm code exchange
src/components/ui             primitives (button, card, field, overlay, toaster…)
src/lib/                      PURE logic + tests: units, expiry, deduct, recipe, planner
src/server/ai/                provider interface, vendor providers, zod schemas, prompt
src/server/services/          ALL database access, every query scoped by userId
```

## Rules that are not optional

1. **The service layer is the security boundary.** Prisma connects as a privileged role and bypasses RLS. Every
   action or page calls `supabase.auth.getUser()` and redirects when there is no user. Every Prisma query filters by
   `userId`, directly or through an owned parent. IDs from the client are never trusted: verify ownership first
   (pattern: the `ownItemIds` check in `commitReceipt`). RLS in `prisma/rls.sql` is defense-in-depth only.
2. **AI output is untrusted.** Validate with zod (`ai/schemas.ts`, `ai/recipe-schemas.ts`) before any DB write,
   including size: recipes have per-field length caps and a repeated-word loop check, and are validated one by one. The
   model never decides what the user has: `reconcileRecipe` does, in code. Allergens and dislikes are a hard filter in
   code: `recipeIsForbidden` (EU-14 groups from `lib/allergens.ts`) runs on every recipe a user can be offered,
   including AI output, saved favourites and older suggestions. Only the user-reviewed payload from the review screen
   is committed to inventory. Every AI call first claims a slot with `claimAiUse()` (`services/ai-usage.ts`) against
   the per-user daily limits in `lib/ai-limits.ts`, and hands it back with `releaseAiUse()` if the provider fails.
3. **Expiry honesty.** `EXACT` / `ESTIMATED` / `UNKNOWN`: never invent a date, always label estimates. All
   labels go through `relativeLabel` / `classifyStatus` in `lib/expiry.ts`; don't fork them.
4. **Units.** Every conversion goes through `convert()` in `lib/units.ts`, which returns `null` rather than guessing.
   `UNIT_DEFS` mirrors the `unit_conversions` seed table, so keep the two in sync. Likewise `RECEIPT_CATEGORIES`
   (`ai/schemas.ts`, the list the receipt AI picks from) mirrors the seeded categories.
5. **Pure logic stays pure and tested.** New domain logic goes in `src/lib` (or `server/ai/*schemas*`) with a `*.test.ts`.
6. **Multi-row writes are transactional, and short.** Use `prisma.$transaction` and pass `tx` down (see
   `createInventoryItem(…, db)`). Do lookups before the transaction and write in batches: the receipt commit runs
   `prepareInventoryItems()` first, then four statements, because per-row queries inside one transaction ran past its
   20 s limit on a 50-line receipt.
7. **Vendor-neutral AI.** Only `*-provider.ts` imports a vendor SDK; everything else uses `AIProvider` from `provider.ts`.
8. **`public/` is served at `/`.** Never put docs, QA notes or design files there.
9. **Inventory deletes are soft** (`isDeleted`), because Undo depends on it.

## Conventions

- Server action shape: `(prev: State, formData) => Promise<State>` with `useActionState`. Return `{ error }` for user
  mistakes, `redirect()` on success, `revalidatePath()` every route whose data changed.
- Comments explain *why* and cite spec sections or issues (`§17`, `ISSUE-009`). Match that density. Don't narrate *what*.
- Styling: tokens from `tailwind.config.ts` and `globals.css`, no raw hex. Join classes with `cn()` from `lib/utils.ts`
  (custom; the project deliberately has no tailwind-merge). The visual system is in [DESIGN.md](DESIGN.md).
- Type sizes use the rem tokens (`text-small` 13px, `text-compact` 14px, `text-body` 15px, `text-2xs`…), never
  `text-[13px]`: px sizes ignore the "Larger text" preference.
- Reach for the shared pieces before writing markup: `Card` / `LinkRow`, `ActionBar` (sticky main action),
  `FormError` (form-level error), `SectionLabel` (group heading), `Button`, `Field`. `cn()` can't override a
  component's padding (no tailwind-merge), so extend with classes that don't clash.
- The design detector (`.claude/skills/impeccable/scripts/impeccable detect src/app src/components`) is at 0 findings;
  the three sanctioned exceptions, with reasons, are in `.impeccable/config.json`.
- Pages sit in a 760px column on desktop. A page that needs the full width marks its `<main>` with `data-wide`
  (only Today does).
- Commits: conventional style with severity, e.g. `fix(P2): …`, `chore(qa): …`, `test(qa): …`.
- Branch before committing; `main` is the release branch.

## Project skills and agents (`.claude/`)

- `skills/impeccable`: UI design, audit, critique and polish. Read its `SKILL.md` Setup first. On Windows use
  `scripts/impeccable.cmd`; the launcher downloads its binary on first run. It uses the four `agents/impeccable-*.md`.
- `skills/prototype`: throwaway variants that settle one design or logic question. Prototypes live on a branch that
  never merges.
- The UI work is PLAN.md Phase 5. This app is an **Operate** surface, so refine the incumbent look; don't redesign it.

## Data-model gotchas

- A recipe's real ingredient list lives in `Recipe.nutrition.ingredientList` (JSON). `RecipeIngredient` rows exist only
  for ingredients that resolve to one of the ~23 seeded canonical ingredients.
- `ingredient_aliases` is **global** across users and learns from receipt commits (`receipt.ts`, alias insert, first
  writer wins).
- The database is in Supabase **eu-west-1**, so `vercel.json` pins functions to **dub1** (Dublin) next to it. The
  default (iad1, Washington) put every query across the Atlantic. Move the two together.
- Form fields send `""` for "none": `reviewedItemSchema` turns blank text into `null` and drops a category id that
  isn't a UUID. An empty category id used to fail the whole receipt commit.
- Money and quantities are `Float`. Round for display with `tidy()`.
- Day boundaries (`setHours(0,0,0,0)`) run in the **server** timezone, which is UTC on Vercel, not the user's.
- Each "Plan" run creates a new `MealPlan`. Old plans are not pruned.
- `ai_usage` holds one row per AI call (scan, dinner ideas, plan) and is what the daily limits count, because receipts
  and suggestions can be deleted. Rows are kept as a usage record. RLS is on with no policies: server-only.
- `.env` points at the live Supabase database; there is no separate dev database. Apply a new migration with
  `npx prisma migrate deploy` (pending migrations only), not `migrate dev`, which can offer to reset on drift.

## Environment

See `.env.example`. Server-only keys never get a `NEXT_PUBLIC_` prefix. `src/instrumentation.ts` validates the
environment once at server start with `checkEnv()` from `src/lib/env.ts`, and the app stops booting if it's invalid.
Code still reads `process.env` directly. The key for the selected `AI_PROVIDER` (default `gemini`) is required.

Receipt uploads: the scan page shrinks photos on the device (`scan/shrink-image.ts`) before upload, and the server
trusts only the file's bytes (`sniffReceiptType`) and a 4 MB limit, all in `src/lib/receipt-file.ts`. The Server Action
body limit is 4.5mb in `next.config.mjs` (Vercel caps requests at 4.5 MB), so don't raise one without the other.
Anthropic provider: the default model is `claude-sonnet-5`. Moving to `claude-sonnet-5-5` / `claude-opus-5-5` requires
first replacing forced `tool_choice: {type: "tool"}` (a 400 on those models) with structured outputs.

## Accepted, don't "fix" without a ruling

ISSUE-011/012 (expiry label wording and the `Math.ceil` lag), ISSUE-010 (shopping duplicates are skipped, not merged).
See REVIEW.md §Carried-over.
