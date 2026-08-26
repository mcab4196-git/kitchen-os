# M1 — Step 1: Inventory core (add + view) + engines

Drop these files into your existing project root (they preserve their paths).
Nothing from M0 needs re-running except `npm install` (for vitest).

## New files
- `src/lib/units.ts` — UnitService: normalize + convert units (mass/volume/count, count↔mass via piece weight). Pure, tested.
- `src/lib/expiry.ts` — ExpiryService: estimate expiry from shelf-life rules (by specificity) + classify status. Pure, tested.
- `src/lib/units.test.ts`, `src/lib/expiry.test.ts` — 23 unit tests.
- `vitest.config.ts` — test runner config (pure logic only; no DB needed).
- `src/server/services/reference.ts` — form reference data + free-text ingredient resolution via aliases.
- `src/server/services/inventory.ts` — createInventoryItem (with honest expiry), listInventory, getInventoryItem. All scoped to the user.
- `src/app/(app)/inventory/actions.ts` — server action for the add form.
- `src/app/(app)/inventory/new/page.tsx` + `form.tsx` — add-item screen.
- `src/components/inventory/expiry-badge.tsx`, `item-card.tsx` — UI.

## Changed files
- `src/app/(app)/inventory/page.tsx` — stub → real list.
- `src/app/(app)/dashboard/page.tsx` — now shows a live "Use soon" list.
- `package.json` — adds `vitest` and `test` / `test:watch` scripts.

## Run
```bash
npm install          # picks up vitest
npm test             # 23 tests should pass — no DB required
npm run dev
```

## Verify
1. `npm test` → all green.
2. Dashboard → **Add item**.
3. Add "Chicken breast", type ingredient "chicken breast", qty 500 g, storage Fridge, leave expiry blank → save.
   You should land on Inventory with a **red "Use now" badge marked (est.)** — the engine estimated 1–2 days from today.
4. Add "Rice", ingredient "rice", 2 kg, Pantry, blank expiry → a green **Fresh** badge far in the future.
5. Add anything with **no** matching ingredient and blank expiry → a grey **No date** badge (we don't invent one).
6. Dashboard shows the soon-to-expire items under "Use soon".

Estimated dates always carry the "(est.)" marker; exact dates you enter yourself do not.
