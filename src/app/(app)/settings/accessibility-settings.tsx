"use client";

import { useState, useTransition } from "react";
import { saveAccessibility } from "./actions";

type Key = "largerText" | "reduceMotion" | "absoluteDates";

const ROWS: { key: Key; label: string; hint: string }[] = [
  { key: "largerText", label: "Larger text", hint: "Makes all text in the app a size bigger." },
  { key: "reduceMotion", label: "Reduce motion", hint: "Keeps progress indicators, drops the rest." },
  { key: "absoluteDates", label: "Show expiry dates as text", hint: "“7 Sep” instead of “in 2 days”." },
];

export function AccessibilitySettings({ initial }: { initial: Record<Key, boolean> }) {
  const [state, setState] = useState(initial);
  const [, startTransition] = useTransition();

  // These used to submit a <form action>. React 19 resets a form after its action runs,
  // which flipped the switch back to Off while the setting stayed On (PLAN 5.6). Now the
  // action is called directly, and the look changes on tap, before the save lands.
  function toggle(key: Key) {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    const root = document.documentElement;
    if (key === "largerText") root.dataset.largerText = String(next.largerText);
    if (key === "reduceMotion") root.dataset.reduceMotion = String(next.reduceMotion);
    startTransition(() => saveAccessibility(next));
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
      {ROWS.map((r) => (
        <li key={r.key}>
          {/* The whole row is the target, not just the 32px switch. */}
          <label className="flex min-h-11 cursor-pointer items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-compact font-medium text-ink">{r.label}</span>
              <span id={`a11y-${r.key}-hint`} className="mt-0.5 block text-small leading-4 text-muted">
                {r.hint}
              </span>
            </span>
            <span className="relative inline-flex h-8 w-[52px] shrink-0 items-center">
              <input
                type="checkbox"
                role="switch"
                aria-label={r.label}
                aria-describedby={`a11y-${r.key}-hint`}
                checked={state[r.key]}
                onChange={() => toggle(r.key)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-line-strong transition-colors duration-fast peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
              <span className="pointer-events-none absolute left-[3px] h-[26px] w-[26px] rounded-full bg-card shadow-xs transition-transform duration-fast peer-checked:translate-x-5" />
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
