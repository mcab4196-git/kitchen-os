"use client";

import { useEffect, useRef, useState } from "react";
import { saveAccessibility } from "./actions";

type Key = "largerText" | "reduceMotion" | "absoluteDates";

const ROWS: { key: Key; label: string; hint: string }[] = [
  { key: "largerText", label: "Larger text", hint: "Follows your phone's text size." },
  { key: "reduceMotion", label: "Reduce motion", hint: "Keeps progress indicators, drops the rest." },
  { key: "absoluteDates", label: "Show expiry dates as text", hint: "“7 Sep” instead of “in 2 days”." },
];

export function AccessibilitySettings({ initial }: { initial: Record<Key, boolean> }) {
  const [state, setState] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    formRef.current?.requestSubmit();
  }, [state]);

  return (
    <form ref={formRef} action={saveAccessibility}>
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
        {ROWS.map((r) => (
          <li key={r.key} className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-medium text-ink">{r.label}</span>
              <span className="mt-0.5 block text-[12.5px] leading-4 text-muted">{r.hint}</span>
            </span>
            <label className="relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                name={r.key}
                checked={state[r.key]}
                onChange={() => setState((s) => ({ ...s, [r.key]: !s[r.key] }))}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-line-strong transition-colors duration-fast peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
              <span className="pointer-events-none absolute left-[3px] h-[26px] w-[26px] rounded-full bg-card shadow-xs transition-transform duration-fast peer-checked:translate-x-5" />
            </label>
          </li>
        ))}
      </ul>
    </form>
  );
}
