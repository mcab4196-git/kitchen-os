---
name: Kitchen OS
description: Know what you have, what's about to expire, and what to cook.
colors:
  brand: "#2B584C"
  brand-soft: "#E6EEEA"
  brand-ink: "#1E3E36"
  brand-contrast: "#FFFFFF"
  accent: "#E8833A"
  accent-soft: "#FBEBDC"
  accent-fg: "#954716"
  surface: "#FBFAF7"
  surface-2: "#F6F4EF"
  card: "#FFFFFF"
  ink: "#1C1B19"
  muted: "#6A6862"
  faint: "#8D8B83"
  line: "#E4DFD6"
  line-strong: "#C9C2B4"
  status-critical: "#C64A3B"
  status-critical-fg: "#B0382A"
  status-critical-bg: "#F7E9E6"
  status-critical-border: "#E6C7C0"
  status-soon: "#D9932E"
  status-soon-fg: "#8A5814"
  status-soon-bg: "#F7ECDA"
  status-soon-border: "#E7D3AC"
  status-soon-bar: "#B8791E"
  status-fresh: "#4E9C6B"
  status-fresh-fg: "#2D784D"
  status-fresh-bg: "#E7F1E9"
  status-fresh-border: "#C1DDC9"
  status-unknown: "#8A8A82"
  status-unknown-fg: "#6F6C63"
  status-unknown-bg: "#EFEDE8"
  status-unknown-border: "#DBD6CC"
typography:
  title-lg:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.125rem"
    fontWeight: 500
    lineHeight: "2.375rem"
    letterSpacing: "-0.024em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: "2.125rem"
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: "1.75rem"
    letterSpacing: "-0.014em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  read:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: "1.7rem"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1rem"
    letterSpacing: "0.01em"
rounded:
  control: "0.7rem"
  card: "1rem"
  sheet: "1.25rem"
  pill: "9999px"
spacing:
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "9": "36px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-contrast}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-ink}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.status-critical-bg}"
    textColor: "{colors.status-critical-fg}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  chip-filter:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "38px"
  chip-filter-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-contrast}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  badge-critical:
    backgroundColor: "{colors.status-critical-bg}"
    textColor: "{colors.status-critical-fg}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  badge-soon:
    backgroundColor: "{colors.status-soon-bg}"
    textColor: "{colors.status-soon-fg}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  badge-fresh:
    backgroundColor: "{colors.status-fresh-bg}"
    textColor: "{colors.status-fresh-fg}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  badge-unknown:
    backgroundColor: "{colors.status-unknown-bg}"
    textColor: "{colors.status-unknown-fg}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  nav-tab-active:
    textColor: "{colors.brand}"
    typography: "{typography.label}"
---

# Design System: Kitchen OS

## Overview

**Creative North Star: "The Kitchen Notebook"**

Kitchen OS should feel like the notebook that lives by the fridge: warm paper, a short list of what to do today,
and honest notes about what's in stock. The mood is warm, calm and honest. Nothing shouts. Urgency is carried by
four functional status colours and plain words, never by alarm styling. Density is moderate. The app is used one-handed,
often with wet hands and at arm's length, so controls are sturdy and forgiving, and type stays generous.

The world is warm near-white paper (Rice Paper) with one deep herb green (Pandan) for action and one warm orange
(Kalabasa) for anything you need to buy. A soft serif (Fraunces) sets titles; a neutral sans (Inter) carries everything
you read as data or tap. Light and dark are one token swap; components never branch on theme.

The home screen direction approved on 2026-10-25 takes two quiet cues from JRPG menus: a double-ruled card for the one
thing that matters most today, and a freshness bar that shows how much life an ingredient has left. The influence stays
in form and never reaches the words (see Do's and Don'ts). Evidence: the private design canvas linked in PLAN.md 5.5.

**Key Characteristics:**
- Warm paper surfaces, hairline borders and a soft, slightly lifted shadow.
- One action colour (Pandan) and one buying colour (Kalabasa); four status colours that only ever mean expiry.
- Serif titles, sans everything else, tabular numbers for quantities.
- 44px minimum targets; primary actions in the thumb zone.
- Every status shown as a word first, with colour and graphics as support.

## Colors

A warm, low-chroma paper palette with one herb green, one squash orange and a four-step functional status scale.
Tokens are RGB channel triples on `:root` in `src/app/globals.css`, exposed as Tailwind colours in
`tailwind.config.ts`; a single `prefers-color-scheme: dark` block swaps every value. Dark values are in
`.impeccable/design.json`.

### Primary
- **Pandan** (brand): primary buttons, the active tab and sidebar item, focus rings, links, the logo tile. The colour of
  doing something.
- **Pandan Mist** (brand-soft): the selected sidebar item, the "Cook these tonight" prompt, ghost-button hover.
- **Pandan Deep** (brand-ink): primary-button hover and text on Pandan Mist.

### Secondary
- **Kalabasa** (accent): anything to buy or missing: "Buy 1 item", "Missing", the accent button. Used as a tint, never as
  a solid fill behind white text.
- **Kalabasa Cream** (accent-soft) and **Kalabasa Ink** (accent-fg): the tint and its AA-legible text.

### Neutral
- **Rice Paper** (surface): the page. **Rice Paper Shade** (surface-2): sunken areas, hovers, empty states.
- **Card White** (card): cards, inputs, sheets, the tab bar.
- **Ink** (ink): body text and titles. **Muted** (muted): secondary text, meta lines, inactive sidebar items.
- **Faint** (faint): chevrons, separator dots and decorative icons only (see Don'ts).
- **Hairline** (line) and **Hairline Strong** (line-strong): borders, dividers, control outlines, dashed empty states.

### Status (functional)
Each status has three roles, because one hex can't be both readable text and a correct fill:
- **Critical** (status-critical, -fg, -bg, -border): Use now, Expired.
- **Soon** (status-soon, …): Use soon, Not enough. **Soon Bar** (status-soon-bar) is a deeper amber for the freshness bar
  fill only, because the base amber is under 3:1 on white.
- **Fresh** (status-fresh, …): Fresh, Have, Used in time, success toasts.
- **Unknown** (status-unknown, …): No date.

### Named Rules
**The Status Words Rule.** The four status colours mean one thing: how soon food expires (and, by extension, have /
not enough). Never use them for branding, categories or decoration, and never show one without its word.

**The Three Roles Rule.** Text uses the `-fg` role, tints use `-bg` and `-border`, and the base value is for dots, bars and
fills only. A base status colour is never used as text.

**The Kalabasa Is For Buying Rule.** Orange marks what you need to get. Never white text on Kalabasa or on status amber;
use the soft tint with its ink.

## Typography

**Display Font:** Fraunces (with Georgia, serif), weights 500 and 600, self-hosted through `next/font`.
**Body Font:** Inter (with system-ui, sans-serif).

**Character:** Fraunces brings a little warmth and handwriting-adjacent softness to titles without the coldness of a
high-contrast serif; Inter keeps every number, label and control plain and legible at arm's length.

### Hierarchy
- **Title Large** (500, 2.125rem/2.375rem, -0.024em): login and not-found headlines, the big quantity on the Use screen.
- **Title** (500, 1.75rem/2.125rem, -0.02em): every top-level page title (PageHeader, size lg).
- **Title Small** (500, 1.375rem/1.75rem, -0.014em): section headings ("Use soon"), sheet titles, empty-state titles.
- **Body** (400, 15px, 1.5): the default for everything else. Secondary lines drop to 13–13.5px in Muted.
- **Read** (400, 1.0625rem/1.7rem): recipe steps and other long copy; keep lines near 65ch.
- **Label** (500, 0.6875rem/1rem, 0.01em): badges, tab labels, meta. Bucket headers on Inventory use it uppercase with
  0.1em tracking.

### Named Rules
**The Serif Titles Rule.** Fraunces sets titles only: page titles, section headings, sheet and empty-state titles, and the
wordmark. Anything a person taps, scans or compares is Inter.

**The Tabular Numbers Rule.** Quantities, counts and dates use tabular figures (`.tabular`), so columns and counters
don't jitter.

## Layout

Mobile first. Content sits in a centred 480px column (max-w-app) with 16px gutters. A fixed bottom tab bar (64px, plus
the safe-area inset) holds Home, Inventory, Cook, Shopping and Settings, and the page bottom padding clears it. From
1024px (lg) the tab bar becomes a sticky 224px sidebar (wordmark, Scan receipt, the five
destinations, Receipt history at the foot) beside a content column of up to 760px, inside a 1152px shell with 32px
gutters. Sheets rise from the bottom on phones and become centred dialogs from 640px.

Rhythm: 24px between a page header and its content, 36px before a major section, 8–12px between rows and cards,
10px between paired buttons. A fixed set of filter chips wraps onto more lines rather than scrolling sideways, so every
option stays visible and reachable with a mouse. Only open-ended strips (Quick add on the add-item form) scroll
sideways, with a faded right edge.

Home is **Today** (PLAN 5.8). On phones, the Tonight card sits above the "Also to do" list. On desktop, Today takes
the full content width (a page opts in by marking its `<main>` with `data-wide`): the list sits on the left and the
Tonight card on the right. Below 1024px it stacks back into one column.

## Elevation & Depth

Paper on a counter. Surfaces are separated mainly by hairline borders and tonal steps (Rice Paper, Rice Paper Shade, Card
White), with a soft, slightly lifted shadow under cards. A clearly stronger shadow is reserved for things that float
above the page. Shadows are tinted from Ink through `--shadow` (black in dark mode) and always carry an offset and blur.

### Shadow Vocabulary
- **Whisper** (`box-shadow: 0 1px 1px rgb(var(--shadow) / 0.04)`): primary buttons and the active filter chip.
- **Card** (`box-shadow: 0 1px 2px rgb(var(--shadow) / 0.05), 0 8px 24px rgb(var(--shadow) / 0.08)`): cards and link rows
  at rest. Raised slightly on 2026-10-25 so cards read as lifted off the page.
- **Pop** (`box-shadow: 0 6px 16px rgb(var(--shadow) / 0.10), 0 24px 64px rgb(var(--shadow) / 0.20)`): sheets, dialogs,
  toasts, the floating Add button, and hovered interactive cards. Strengthened on 2026-10-25 so overlays separate
  clearly from the lifted cards.
- **Nav** (`box-shadow: 0 -1px 0 rgb(var(--line) / 1), 0 -8px 24px rgb(var(--shadow) / 0.04)`): the bottom tab bar's top
  edge.

### Named Rules
**The Paper On A Counter Rule.** Resting surfaces get a hairline and the Card shadow. Only things that float (sheets,
dialogs, toasts, the floating Add button) and an interactive card under the pointer take Pop.

## Shapes

Gently rounded controls (0.7rem) and cards (1rem); sheets round their top corners (1.25rem). Badges, filter chips, the
floating Add button and the toaster are pills. Borders are 1px hairlines; empty states use a dashed Hairline Strong border
on Rice Paper Shade. Icons are 1.75px outline strokes, thickening to 2px when active.

The **double rule** is a 3px double border in Hairline Strong (#C9C2B4) on a 16px-radius card: Today's Tonight card and
the Stock changes card on Dinner done. The check seal on Dinner done uses a double Pandan ring.

**The Double-Rule Rule.** The double border marks the single most important card on a screen. Never more than one per
screen, and never on list rows.

## Components

### Buttons
Sturdy and forgiving.
- **Shape:** gently rounded (0.7rem), 44px tall at sm and md, 48px at lg. Dashboard actions go to 56px.
- **Primary:** Pandan with white text and the Whisper shadow; hover deepens to Pandan Deep.
- **Secondary:** Card White with a Hairline Strong border; hover shifts to Rice Paper Shade.
- **Ghost:** text only; hover tints Pandan Mist.
- **Accent:** Kalabasa Cream with Kalabasa Ink text and a faint Kalabasa border.
- **Destructive:** the Critical tint with Critical text.
- **States:** every button presses down 1px and scales to 98.5%. Focus is a 2px Pandan outline at a 2px offset. Disabled
  drops to 45% opacity. Loading keeps the width and shows a centred spinner.

### Chips
- **Style:** pills, 38px tall, 13px medium text, an optional tabular count. Inactive chips are Card White with a hairline
  and Muted text.
- **State:** active is solid Pandan with white text and the Whisper shadow. Chips press to 95%.

### Badges (expiry)
- **Style:** a pill in the status tint, Label type, with a 6px dot in the base colour. The text reads "Use now · today",
  "Use soon · in 2 days est.", "Fresh · in 12 days", "Expired · yesterday" or "No date".
- **State:** an urgent badge on a triage surface may beat once on first paint (`status-beat`), never on a loop.
- **Where:** since PLAN 5.8, lists show expiry with the Freshness Bar instead. The badge and the bar share one set of
  status words (`EXPIRY_WORD`), so they can't drift apart.

### Cards / Containers
- **Corner Style:** 1rem.
- **Background:** Card White on Rice Paper.
- **Shadow Strategy:** Card at rest, Pop on hover when interactive (see Elevation).
- **Border:** a 1px hairline, strengthening on hover.
- **Internal Padding:** 16px (14px for inset cards and link rows).
- There is one Card implementation (`components/ui/card.tsx`). Link rows add a trailing chevron that nudges 2px on hover.

### Inputs / Fields
- **Style:** Card White, a Hairline Strong 1px border, 0.7rem radius, 44px tall, 14px text. Labels sit above in 13px
  medium Ink; hints sit below in Label/Muted.
- **Focus:** the border turns Pandan with a 2px Pandan ring at 25%.
- **Error / Disabled:** the error replaces the hint in Critical text with `role="alert"`; disabled drops to 50%.

### Navigation
- **Phone:** a fixed bottom tab bar in translucent Card White with a blurred backdrop and the Nav shadow. Five tabs
  (icon plus label), with at least a 60px target each. Active is Pandan with a 2px bar at the top edge and a 2px icon
  stroke.
- **Desktop:** a sticky 224px sidebar. Items are 0.7rem-rounded rows; active is Pandan Mist with Pandan Deep text.
  Scan receipt is the one primary button in the sidebar.

### Sheets, Dialogs and Toasts
Sheets slide up 16px and fade; dialogs scale from 96%. Both use a 40% Ink scrim, the Pop shadow, a focus trap, Esc to
close and focus restore. Toasts sit above the tab bar: success in the Fresh tint, info in Card White, and Undo when an
item is removed.

### Floating Add button
A 56px Pandan pill, on Today and Inventory on phones only, that carries the screen's main action in the thumb zone. It's
sticky, like the Save bar on forms: it floats above the tab bar while there's more page below, then settles under the
last item, so it never covers the end of a list. It goes last in the page's `<main>`, and its offset matches the
shell's bottom padding, so it settles without a jump.

### Freshness Bar (signature)
The expiry label in Label type and status text colour, with a 6px rounded bar under it (160px wide) showing how much
shelf life is left: time remaining ÷ (expiry − purchase date, falling back to the date added), from `freshness()` in
`lib/expiry.ts`. The fill is the status colour (Soon uses Soon Bar) on a Hairline track. A "today" item keeps a 4%
sliver even a few hours past its date. Expired shows an empty track with a Critical hairline; No date shows a diagonal
hatch (`.hatch`). Used on Today, Dinner done and every inventory row and card, where it replaced the 4px status rail
and the badge. Component: `components/inventory/freshness-bar.tsx`.

**The Label Carries It Rule.** A freshness bar never appears without its text label, and never shows a number. The bar
is hidden from assistive tech, because the label beside it says the same thing.

### Tonight Card (signature)
The double-ruled card on Today. It is picked only from dinner ideas that already exist, so loading the page never
spends an AI call. It shows a Title Small heading ("Use the Pork belly tonight"), one line naming the dish (linked to the
recipe), freshness rows for the expiring items it uses, Not enough and Missing lines, then Cook & deduct (primary) and
Other ideas (secondary). When no idea uses the expiring stock, it becomes "Plan dinner around the …" with a single
"What's for dinner?" button. When nothing needs using, a Fresh-tinted note takes its place.

## Do's and Don'ts

### Do:
- **Do** style through the Tailwind tokens (`bg-brand`, `text-status-soon-fg`), never raw hex in components, and join
  classes with `cn()`.
- **Do** show every status as its word first: Use now, Use soon, Fresh, Expired, No date, with "est." on every estimate.
- **Do** keep every control at least 44px tall, and keep the main actions in the thumb zone on phones (the floating Add
  button) and in the sidebar or page header on desktop.
- **Do** use Fraunces for titles and Inter for everything else, with tabular figures for numbers.
- **Do** honour reduced motion: remove motion that moves, but keep spinners and progress turning (`.motion-keep`).

### Don't:
- **Don't** use game vocabulary (HP, quest, KO, level, reward, party). The JRPG influence lives in form only, confirmed by
  the owner on 2026-10-25.
- **Don't** use Faint for text people must read: it's 3.4:1 on white. Today it's still on inactive tab labels and input
  placeholders (logged for PLAN 5.3).
- **Don't** put a coloured stripe thicker than 1px down the side of a card or row. The old 4px status rail was replaced by
  the freshness bar in PLAN 5.8.
- **Don't** put an eyebrow or kicker above a heading.
- **Don't** put white text on Kalabasa or status amber.
- **Don't** use more than one double-ruled card on a screen.
- **Don't** pin a button in place over scrolling content. Floating actions are sticky, like the Save bar: they float
  while there's more below and settle after the last content, so the end of a page is never covered (owner,
  2026-10-25).
