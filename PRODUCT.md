# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of the public in the Philippines who cook at home: the person in a household who does the grocery shopping
and decides what's for dinner. They use Kitchen OS on their phone in three moments: right after a shop (scanning the
receipt), at the fridge or stove (checking what needs using, deducting what they cooked), and in the store (the
shopping list). One login is one kitchen; shared household accounts are not built.

## Product Purpose

Kitchen OS helps people waste less food. It knows what's in the kitchen, what's about to expire and what to cook
with it. Success means items get used before they expire and less food gets thrown out.
Shipped tagline: "Know what you have, what's about to expire, and what to cook."

## Positioning

The full loop, driven by one inventory: scan a receipt → inventory with honest expiry → dinner ideas and plans from
real stock, expiring items first → cook and deduct → shop only for what's missing. There's no single headline feature.
The value is that each step feeds the next from the same source of truth, so keeping the inventory accurate costs
the user almost nothing.

## Operating Context

- Phone-first and often one-handed: in a kitchen with wet or messy hands, in a store aisle, or while unpacking groceries.
- Printed grocery receipts photographed with the phone camera, or PDF e-receipts.
- Philippine ingredients and dishes. Filipino cuisine is a first-class preference alongside others.
- Currency is PHP. Metric units by default, imperial available. Interface language is English.
- Budget Android phones on mobile data are a common setup.

## Capabilities and Constraints

Shipped in v1.0.0:

- **Inventory:** add, edit, use and delete (with undo); search; filter by storage location and expiry; sort.
- **Expiry:** every item is `EXACT`, `ESTIMATED` or `UNKNOWN`. Estimates come from shelf-life rules (ingredient first,
  then category) by storage location and opened state. They're labelled "(est.)", and a date is never invented.
- **Receipt scanning:** AI extracts the lines, the user reviews every one, and only reviewed items enter inventory.
  A receipt scanned twice is detected.
- **What's for dinner?:** three ideas, saved favourites first and AI-generated ones after. Each shows what you
  have, what you have "not enough" of, and what's missing from real stock.
- **Cook & deduct:** removes the quantities used, converting units where needed.
- **Meal plan:** 3 or 7 dinners, expiring items first, no ingredient used twice.
- **Shopping list:** manual items plus a recipe's quantity-aware shortfall.
- **Alerts:** expired / today / soon against a per-user threshold; opt-in browser notification.
- **Preferences:** household size, diet, allergies, dislikes, cuisines, cooking skill, max cook time, units, currency,
  and how many days ahead to warn.
- **Accounts:** email and password.

Constraints:

- AI output is never trusted. Availability, shortfalls and allergen exclusion are computed in code. Allergens are a
  hard filter.
- The product is **free**, so AI calls (scans, dinner ideas, plans) must stay within firm per-user caps.
- Users are public. One user's data or corrections must never change what another user sees.

Open decisions (record, don't assume):

- The numbers for the per-user AI caps.
- Whether learned ingredient aliases stay shared across users or become per-user.
- The AI provider's data policy for public users (Gemini's free tier may use inputs for training).
- Privacy policy and terms of use (none exist yet).
- Household sharing; Filipino/Taglish localisation.

Terminology (as shipped): inventory, Use soon, Expired, No date, (est.), What's for dinner?, Cook & deduct, Scan receipt,
Shopping list.

## Brand Commitments

- Name: **Kitchen OS**. Tagline as above.
- Voice *(observed in the shipped copy, not yet confirmed as binding)*: plain, warm, second person. Honest about
  estimates and about the AI ("fix anything the AI got wrong"). British spelling (favourite, prioritise).

## Evidence on Hand

- App icon `public/icon.svg`; PWA manifest `public/manifest.webmanifest`.
- Design mock `public/Kitchen OS Mobile.dc.html`, slated to move out of `public/`.
- Reference data in `prisma/seed.ts`: 12 categories, 23 ingredients, shelf-life rules and unit conversions.
- No users, testimonials, usage metrics, press or waste-reduction results exist yet. Don't fabricate any (no
  "saves ₱X a month", no "cuts waste by Y%").

## Product Principles

1. **Inventory is the source of truth.** Every feature reads from it and writes back to it.
2. **Never fabricate.** Unknown stays unknown; an estimate is always labelled as one.
3. **The AI proposes, the code decides.** The user reviews AI input before it's stored, and safety is enforced in code.
4. **Expiring first.** Wherever there's a choice, surface and use what's about to go off.
5. **Minimal effort per step.** Scanning beats typing, and "what's expiring" is one tap from "what to cook".

## Accessibility & Inclusion

- WCAG 2.2 AA.
- Must perform well on low-end Android phones over mobile data: small bundles, light images, fast first load.
- Shipped preferences: larger text, reduced motion, absolute dates instead of relative ones. Pinch-zoom is never disabled.
- Kitchen use: touch targets of at least 44 px, legible at arm's length and with wet hands.
