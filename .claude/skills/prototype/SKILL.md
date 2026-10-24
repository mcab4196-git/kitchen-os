---
name: prototype
description: Settle one design question by building throwaway variations instead of discussing it — "what should this screen look like?" or "does this logic / state model behave right?". Use when a question can't be resolved by talking (several layouts you can't picture, a state machine whose edge cases you can't hold in your head), when the user asks for options to choose between, or for a prototype, mockup, variants or a spike. Not for implementing a design already settled, and not for debugging something already built.
---

# Prototype

Write **throwaway code that answers one question**. The question comes first and
decides what you build; a prototype that answers the wrong question is wasted,
however good it looks.

Throwaway limits how the code is *written*, not whether it is kept: no tests, no
error handling beyond what makes it run, no abstractions, no persistence. Two
things survive — the **answer** goes into the real project, and the **prototype**
is kept as evidence on a branch that never merges.

Adapted from Matt Pocock's `prototype` (MIT; original and licence in this folder).

## 0. Before building

1. **Write the question as one sentence** and show it to the user. If it takes a
   paragraph, it is several questions: split them and do one.
2. **Check it needs a prototype.** If the user already knows what to build, build
   it. If talking would settle it in two messages, talk.
3. **Read the project's own rules first** (CLAUDE.md, AGENTS.md, README, design
   docs). Variants must respect what the project forbids — a banned pattern is not
   an option to offer. If the user's request collides with a rule, say so in one
   line and let them decide; never quietly break the rule or quietly drop the ask.
4. **Pick the branch** from the question (below).

## 1. Branch A — "What should this look like?"

Build **2–4 radically different variations of the same screen**.

- Variants disagree about **structure and information hierarchy**, not colour or
  copy. Three card grids with small tweaks answer nothing. Good feedback sounds
  like "the header from B with the list from C".
- Same content in every variant, so the comparison is fair. Use **real data and
  real density** wherever the project has it; an empty page always looks fine.
  When sample values are unavoidable, label them as samples.
- Show the moments that decide the feel, not only the landing state: the screen
  after a key action, an empty state, an error.
- Stay inside the project's existing tokens, type and components unless the
  question is about changing them.

Pick the surface:

- **Options for the user to choose from** (they asked for a canvas, mockups or
  options, or the project has no running UI yet): one board per variant per
  screen, side by side, a short note per variant saying what it maps to. A design
  canvas or a single HTML page with all variants both work. Rationale goes in your
  reply, not inside the mockups.
- **Inside the real app** (the direction is chosen or narrowed and needs testing
  with live data): variants on one real route, switchable from a small floating
  bar and a `?variant=` URL parameter, rendered inside the real page.

## 2. Branch B — "Does this logic / state model feel right?"

Build **one self-contained HTML file** someone can open by double-clicking — no
build, no server, still works after being emailed:

- a labelled **state panel** that re-renders after every action;
- **free-play buttons** to poke the model in any order;
- **guided walkthroughs**, one scenario per tab, with the ordered buttons to press;
- everything labelled in the **domain's language**, so a non-coder can drive it.

Keep the logic in a **small pure module** inside the file (a reducer, a state
machine, plain functions; no DOM code), so the validated version can move into
the real code unchanged.

## 3. Both branches

- State lives in memory, starts with no setup, and is fully visible after every
  step.
- The moment you add a test, wire a real database or generalise for a later case,
  you have stopped prototyping. Stop.
- Answer it in **one sitting**. Still building a day later means the question was
  too big; split it.
- Put the one-sentence question at the top of the demo, not only in your head.

## 4. Ask for the verdict

Present the variants briefly — one line each on the idea and the trade-off — and
ask the user to pick, combine or reject. Expect combinations ("B's layout with C's
cards"); a combination is a new variant, so show it once before implementing it.

## 5. Where things go afterwards

- **The answer** (verdict plus the question it settled) goes somewhere permanent:
  the project's design or decision doc, an ADR, the commit message, or the
  implementation issue. Main keeps the answer.
- **The prototype** is kept, not deleted, and not merged: commit it to a
  `prototype/<name>` branch off main, never merge it, and point to that branch
  from wherever the answer was recorded. Mockups made outside the repo (a canvas,
  an HTML file) are linked the same way.
- **Then implement** the chosen direction properly, with the project's normal
  tests and checks. Prototype code is reference, not a starting point to harden.

## It's working if

- The question fits in one sentence and is written at the top of the demo.
- A non-coder can drive the logic demo and describe what they see.
- Someone says "wait, that shouldn't be possible" or "huh, I assumed X" — a bug
  in the *idea*, which is what the prototype is for.
- The UI variants differ in layout and hierarchy, and the feedback mixes parts of
  them.
- When it is over, main holds the decision and none of the prototype code, and the
  decision points at the branch or canvas that holds the evidence.

## Don't

- Prototype the whole application. "What is the whole app?" is not one question;
  a full-app prototype drifts into production with prototype-grade code. Build a
  demo on purpose if a demo is what's needed.
- Offer variants the project's rules forbid.
- Recommend `prototype` when the design is already settled — the next step then is
  to implement.
- Burn tokens on questions a short conversation would answer. The fair comparison
  is the prototype's cost against building the wrong thing.
