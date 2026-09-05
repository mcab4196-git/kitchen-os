# Kitchen OS — mobile redesign, sequenced Claude Code prompts

Six PRs, in order. Each is self-contained, ships behind no flag, and leaves the app working.
Paste one prompt per session. Design reference: `Kitchen OS Mobile.dc.html` in the design project
(option ids in brackets, e.g. `[1c]`, map to that file).

**Standing rules — repeat these in every session:**

- Do not add dependencies, change the stack, or touch `prisma/`, `src/server/services/*`, `src/lib/expiry.ts`, `src/lib/units.ts`, `src/lib/deduct.ts`, or any `actions.ts` signature. This is a presentation-layer redesign. If a screen needs data that isn't already queried, say so and stop instead of writing a new query.
- No new colors, fonts, radii, shadows or spacing values. Everything comes from `tailwind.config.ts` and `globals.css` as they stand. If you reach for a literal hex, you have gone wrong.
- No feature may be removed, renamed or made harder to reach. Every route in `src/app/(app)/` keeps a discoverable path to it.
- Accessibility is acceptance criteria, not polish:
  - Status is always a **word plus a shape**, never color alone.
  - Every interactive target ≥44×44px, including icon-only buttons.
  - Every input has a visible `<label>` (`htmlFor`) — never a placeholder as the only label.
  - Keyboard reachable in DOM order, `focus-visible` ring intact (it comes from `globals.css` — don't override `outline`).
  - Quantity, check-off and undo changes announce through `role="status"` / `aria-live="polite"`.
  - Layout must reflow with no clipping or overlap at 200% zoom and at the largest OS text size: no fixed heights on text containers, no `whitespace-nowrap` on content, `min-h-*` instead of `h-*` wherever text lives.
- After each PR: `npm test` (all green), `npm run build`, then manually walk the changed screens at 375px width, at 200% zoom, and with VoiceOver/TalkBack on.

---

## PR 1 — Layout shell, reachability, and the `min-h` sweep

**Goal:** make the existing chrome one-handed and zoom-proof before touching any screen.

1. `src/app/(app)/layout.tsx` — keep the `max-w-app` column and the `SideNav`/`BottomNav` split. Change only the bottom padding so it accounts for the new raised action button: `pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+5.5rem)]` on mobile, unchanged (`lg:pb-16`) on desktop.
2. `src/components/bottom-nav.tsx` — keep all five labelled tabs and `aria-current`. Raise each tab's tap area from `h-[3.75rem]` to `min-h-[3.75rem]` and add `py-2`, so labels wrap instead of clipping at large text sizes. Keep the active top rail.
3. New `src/components/ui/primary-action.tsx` — a client component rendering a raised pill button, fixed above the tab bar (`bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.25rem)] right-4 z-30 lg:hidden`), 56px tall, `rounded-full bg-brand text-brand-contrast shadow-pop`, icon + visible text label. Props: `href`, `label`, `icon`. Mount it on `/dashboard` and `/inventory` only, linking to `/inventory/new`. Reference `[1c]`, `[1d]`, and the rationale in `[1n]`A.
4. Sweep `src/components/ui/button.tsx`, `field.tsx`, `badge.tsx`: swap fixed `h-*` for `min-h-*` on anything containing text, and bump `Button` size `sm` from `h-9` to `min-h-11` so no button anywhere falls under 44px. Leave `md`/`lg` heights as they are but make them `min-h`.
5. Add a `<span className="sr-only" role="status" aria-live="polite">` mount point to `src/components/ui/toaster.tsx` if the current toast isn't already announced, so PRs 3–5 can rely on it.

**Done when:** every tab and button measures ≥44px in devtools, the Add pill never covers the last list row's actions, and the dashboard reflows cleanly at 200% zoom.

---

## PR 2 — Home as a triage screen `[1c]`

**Goal:** lead with what needs eating, not with counts. Same four queries, reordered and re-weighted.

1. `src/app/(app)/dashboard/page.tsx` — keep the greeting, `getExpiryAlerts`, the three counts and `useSoonItems` exactly as queried. Reorder to: header → alert banner → count row → Scan/Add pair → "Use soon" list → "Cook these tonight" link to `/meals`.
2. Shrink the count cards to a compact three-up row (`p-3.5`, value at `text-title`, label at `text-2xs`) — they are secondary now. Keep each one a link to its filtered inventory view.
3. "Use soon" rows: add a 4px left status rail (`border-l-4`) colored by status alongside the existing `ExpiryBadge`. Rail color comes from the same `classifyStatus` result — extract a tiny `statusRailClass(status)` helper next to `expiry-badge.tsx` so list rows and cards can't drift apart.
4. Add a `/meals` link row headed "Cook these three tonight" below the list, shown only when `useSoonItems.length > 0`.
5. Empty state: keep `EmptyState` but make both actions full-width stacked buttons, Scan first `[1c]` empty variant.

**Done when:** the first thing on screen is what expires, and the empty state gives Scan primary weight.

---

## PR 3 — Inventory grouped by urgency `[1d]`, `[1o]`

**Goal:** keep every filter, search and sort, but group the list so 24+ items stay scannable.

1. `src/app/(app)/inventory/page.tsx` — when `sort === "expiry"` (the default), bucket the already-fetched items client-side by `classifyStatus`: **Use now** (EXPIRED + CRITICAL), **This week** (SOON), **Fresh**, **No date**. Render each non-empty bucket under a sticky header (`sticky top-0 bg-surface/95 backdrop-blur-sm py-1.5 z-10`) carrying the bucket name and count, with a status dot. For `sort === "name" | "recent"`, render the flat list exactly as today. Do not add a query.
2. `src/components/inventory/item-card.tsx` — add the status rail from PR 2. Keep the meta line and `ItemActions` unchanged for urgent buckets `[1o]`A.
3. New `src/components/inventory/item-row.tsx` — the compact two-line variant `[1o]`B for non-urgent buckets: name, meta line, badge, whole row links to `/inventory/[id]/use`. Actions stay reachable on the detail route, so nothing is lost.
4. `src/components/inventory/inventory-controls.tsx` — put counts in the filter chips ("All 24", "Use soon 3", "Expired 1") from the props the page already has; raise chips to `min-h-[38px]`; and **replace the `scrollIntoView` call** with `stripRef.current.scrollTo({ left: ... })` computed from the active chip's `offsetLeft` — `scrollIntoView` on a horizontal strip can scroll the whole page.
5. Give the search input a visible label (`sr-only` is not enough here — use a small "Search" label above, or keep `aria-label` **and** add `type="search"` with `enterKeyHint="search"`).

**Done when:** all seven filters and three sorts still work, buckets appear only when non-empty, and the sticky headers survive 200% zoom.

---

## PR 4 — Add / edit item, with the estimate shown before saving `[1e]`, `[1q]`

**Goal:** one form (do not split into steps), plus one-tap re-add of past items.

1. `src/components/inventory/item-form.tsx` — keep every field and the single server action. Restructure to: name → quantity + unit pair → storage as a 2×2 grid of real radio inputs (labels visible, ≥46px) → expiry date → opened checkbox. Move the submit into a sticky bottom bar (`sticky bottom-0 border-t border-line bg-surface/95 px-4 py-3`) so it clears the keyboard.
2. Under the expiry field, render a live estimate preview: call the existing `ExpiryService` logic through a server action or pass the matched shelf-life rule down from the page, and show "Left blank we'll estimate **7 Sep** — 1–2 days for raw chicken in the fridge", in a `status-soon` tinted box, `role="status"`. It must say **(est.)** and it must never appear when the rule lookup misses — no invented dates.
3. Under the name field, show the resolved ingredient match from `reference.ts` ("Matched to ingredient *chicken breast*") so the user can see why the estimate is what it is.
4. Add a quick-add chip strip above the form `[1q]`C: the user's distinct recently-added items (name + last quantity + unit + storage) from the last 30 days. This needs one new read in `src/server/services/inventory.ts` — the only data change permitted in this PR. Tapping a chip prefills the form; it does not save silently.
5. Reuse the identical form for `/inventory/[id]/edit`.

**Done when:** saving takes one submit, the estimate is visible before saving and labelled est., and no field lost its label.

---

## PR 5 — Use sheet, scan review, shopping `[1f]`, `[1h]`, `[1l]`

**Goal:** the three destructive/consequential flows get confirmation, announcement and undo.

1. `src/app/(app)/inventory/[id]/use/consume-fields.tsx` — replace the plain amount input with a 56px −/+ stepper (`aria-label`ed), tabular numerals, a fraction preset row (¼ ½ ¾ All) as radios, and a `role="status"` line reading "250 g will be left in the fridge." Submit label states the amount: "Use 250 g". Keep the full-page `/use` route working identically `[1f]`.
2. `src/app/(app)/scan/[id]/review/review-form.tsx` — flag low-confidence rows: `border-l-4 border-status-soon` plus a plain-language note ("Read as 'Bnna loose' — did you mean bananas? Quantity unclear."), and a summary count at the top of the list. Non-food rows render struck through, unchecked, with "Not food — excluded". The confirm button states the real count of checked rows `[1h]`.
3. `src/app/(app)/scan/page.tsx` — camera-first: `capture="environment"` on the file input, a 76px primary capture button, "Choose file" as an equal-weight secondary, and the privacy sentence above the button rather than below. Keep drag-and-drop for desktop. Progress text goes in a `role="status"` region, not just the animated bar `[1g]`.
4. `src/app/(app)/shopping/page.tsx` — group items by category/aisle with count headers (falling back to one "Other" group), raise check-off and remove targets to 44px, and route both toggle and remove through the toaster with an **Undo** action `[1l]`.

**Done when:** every quantity change and check-off is announced, and nothing is deleted without an undo.

---

## PR 6 — Cook, recipe, plan, and the accessibility settings group `[1i]`, `[1j]`, `[1k]`, `[1m]`

1. `src/app/(app)/meals/page.tsx` — make "What's for dinner?" a full-width brand hero stating what it will do ("3 ideas from your 24 items, expiring first"). On each recipe card add a reconciliation chip from data the page already has: "Uses 3 expiring" / "Nothing to buy" / "Buy 1 item", and label AI suggestions vs saved recipes in words `[1i]`.
2. `src/app/(app)/meals/[id]/page.tsx` — raise step text to `text-read` (17px/1.7) and add the consequence line under the sticky bar: "Cooking deducts these amounts from your inventory — you'll confirm each one first." Keep the have/to-buy badges as they are, they already pass `[1j]`.
3. `src/app/(app)/plan/plan-controls.tsx` — make plan length a real `<fieldset>`/`<legend>` radio group at 46px. Keep the honest partial-plan message; render unplanned days as a dashed row saying why `[1k]`.
4. `src/app/(app)/settings/page.tsx` — add an **Accessibility** group with three real preferences persisted to `user_preferences`: larger text (follow OS), reduce motion (defaults from `prefers-reduced-motion`), and "show expiry dates as text" (absolute dates instead of relative). The third one must flow through `relativeLabel` in `src/lib/expiry.ts` via a formatting option — do not fork the function. Add rows for Expiry reminders and Receipt history so both are reachable from Settings, not only from the dashboard/sidebar `[1m]`.
5. Extend the `preferences` service and its form with the three new booleans. Migration allowed here and only here; keep defaults matching current behaviour.

**Done when:** every screen in `src/app/(app)/` has been through the standing accessibility rules, and `npm test` plus a full manual walk at 375px / 200% zoom / screen reader are clean.

---

## Not in scope, on purpose

Offline write queue, push notifications, barcode scanning, household sharing, native shell (Capacitor/Expo). Each is a separate design conversation — the PWA polish above is deliberately the cheaper half.
