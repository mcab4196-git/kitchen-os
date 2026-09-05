# Kitchen OS — Pre-Deploy QA Plan

> **How to use this file:** drop it in the repo root. In Claude Code, run one stage per
> session: `Read QA-PLAN.md and execute STAGE 1.` Then `/clear` and
> `Read QA-PLAN.md and QA-REPORT.md, then execute STAGE 2 blocks A–C.` and so on.
> `QA-REPORT.md` carries state across sessions so context compaction doesn't lose findings.

Existing Next.js + Prisma + Supabase app, recently redesigned. The job is to verify that
what's already built actually works before deploy. Do not build anything new.

---

## Ground rules

1. Do **not** redesign the UI, change the visual direction, or add features. Bug fixes only.
2. **Evidence rule:** every `PASS` must cite a `file:line`, a command's output, or a test
   that was run and its result. If something could not be verified, mark it `NOT TESTED`
   and say why. A short honest report beats a long confident one — 15 `NOT TESTED` items
   are better than one fabricated `PASS`.
3. No mock or seed data to make a check pass. Never disable RLS, validation, auth checks,
   or type errors to get green.
4. Work on branch `qa/pre-deploy`. One commit per fix: `fix(P1): <description>`.
5. Never print `.env` contents or secret values — refer to variable names only.
6. Smallest possible diff. Don't refactor working architecture.
7. Write findings into `QA-REPORT.md` as you go, not only at the end.

---

## STAGE 1 — Recon (read-only, no edits)

Inspect: `package.json` scripts, `next.config.*`, `tsconfig.json`,
`prisma/schema.prisma` + migrations, Supabase client setup (server vs browser),
`middleware.ts`, app routes, server actions, API handlers, AI integration, env var usage.

Produce, appended to `QA-REPORT.md`:

1. **Application map** — features and user flows.
2. **Logic index** — `file:line` for: quantity math, expiry calculation, recipe
   ingredient availability, shopping-list delta, receipt → inventory write path.
3. **Testability matrix** — what can be verified by running code, what needs a browser,
   what needs live API keys the user must supply.
4. **Test plan** derived from the above.

Then **STOP** and wait for go-ahead. Modify nothing in this stage.

---

## STAGE 2 — Verify and fix

Work through the blocks in order. Report findings per block before moving on.

### A. Static health

Run the checks already defined in `package.json` (typecheck, lint, build). Don't install
packages just to make checks pass.

Flag: broken/unused imports, undefined variables, wrong server/client component
boundaries (`'use client'` misuse, async in client components), unawaited promises,
hardcoded mock data, dev-only code, `console.log` carrying user or request data,
TODO/FIXME that affect behavior.

### B. Data layer

- Prisma schema validity; migrations consistent with schema (`prisma migrate diff`).
- Relations and foreign keys correct; nullable fields handled.
- Decimal quantities not silently coerced to int or float-rounded.
- Timestamps stored and compared in a consistent timezone.
- Cascade behavior on delete doesn't orphan rows or delete unrelated ones.
- Confirm inventory shown in the UI reads from the DB, not fixtures.

### C. Auth and isolation — highest priority

- Verify signup, login, logout, session persistence, expired-session handling, redirects.
- Confirm every protected route is actually protected — check the middleware matcher for
  gaps, and confirm server actions and API routes re-verify the user rather than trusting
  the client.
- Read **every** RLS policy. For each of inventory, receipts, recipes, meal plans,
  shopping list, and profiles, state whether user A can reach user B's rows, and cite the
  policy that prevents it.
- Report any query using the service-role key where the user's own client should be used.

### D. Core logic correctness — write real tests

Locate or extract the pure functions and test them. These are specs, not examples.

**Quantity math**
- `500g − 300g = 200g`
- consume exact remaining → `0`; not negative, not an error
- consume more than available → explicit rejection or clamp; never negative
- unit mismatch (`g` vs `kg` vs `1 pack`) → defined behavior, not silent corruption

**Expiry labels** (freeze "today" in tests; do not use real `Date.now()`)
- today → `Use now` · tomorrow → `Use tomorrow` · +3d → `Use in 3 days`
- yesterday → `Expired` · null → `Expiry unknown`
- an item must not flip to expired a day early or late across a timezone boundary
- estimated expiry is visually **and** structurally distinguishable from confirmed expiry

**Recipe availability**
- a recipe must never list an ingredient as AVAILABLE when inventory lacks it
- the AVAILABLE vs NEEDS TO BUY split is computed from real inventory

**Shopping list delta**
- inventory tomatoes = 2, recipe needs 4 → list shows **2**, not 4
- duplicate items merge rather than stack

**Full integration** (test end to end)
- inventory: chicken 500g / rice 1kg / spinach 200g
- cook a recipe needing 300g / 200g / 100g
- expect: chicken 200g / rice 800g / spinach 100g
- a next recipe needing chicken 400g → shopping list recommends ~200g

### E. Receipt pipeline

Trace: upload → storage → AI/OCR → structured output → user review → confirm → inventory
write.

- Confirm AI output is schema-validated **before** any DB write.
- Check handling of: unsupported file types, oversized files, AI timeout/error, malformed
  JSON, missing name/quantity/price fields, duplicate receipt submission, cancelled upload.
- Verify that editing an extracted item before confirming actually changes the row written.
- If this requires a live API key, say so and mark `NOT TESTED`.

### F. Error handling and secrets

- Force failure paths: AI down, DB unreachable, invalid ID, unauthorized request, empty form.
- Confirm users see a useful message, and that stack traces, DB errors, connection strings,
  and API keys never reach the client.
- Grep client bundles for secrets. Confirm the service-role key is server-only and that no
  `NEXT_PUBLIC_*` variable holds a private credential.
- Confirm file upload restrictions (type + size) are enforced server-side, not only on the
  `<input>` element.

### G. UI wiring regression (static)

The redesign may have disconnected handlers. Statically verify:

- every button has a handler, or a documented reason to be inert
- every `href` resolves to a real route
- forms submit to the correct action
- modals/dialogs have a working close path
- loading, error, and empty states exist for each async view

**Accessibility:** form labels, focus states, aria on icon-only buttons, touch target
sizes, `prefers-reduced-motion`. Confirm expiry status is never communicated by color
alone.

**Responsive and true interaction testing require a browser.** If Playwright is not
already configured, do **not** attempt to verify these by reading CSS — mark them
`NOT TESTED` and describe what a browser pass would need to cover.

---

## STAGE 3 — Final verification

Re-run typecheck, lint, and a clean production build. Re-run the tests from block D.
Confirm each fix didn't regress something else. Then finalize `QA-REPORT.md`.

Severity scale:

| Level | Meaning |
|-------|---------|
| P0 | Application unusable, or a security issue |
| P1 | Core functionality broken |
| P2 | Important functionality incorrect |
| P3 | Minor UI/UX issue |
| P4 | Cosmetic / non-blocking |

**Do not mark READY if the production build fails, or if any P0 or P1 remains unfixed.**
