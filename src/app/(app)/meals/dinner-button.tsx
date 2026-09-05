"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { whatsForDinner, type MealsState } from "./actions";
import { IndeterminateBar } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

const STAGES = [
  "Reading your inventory…",
  "Matching against saved recipes…",
  "Asking the AI to fill the gaps…",
  "Checking allergies and dislikes…",
  "Writing it up…",
];

export function DinnerButton({ itemCount = 0 }: { itemCount?: number }) {
  const [state, action, pending] = useActionState<MealsState, FormData>(whatsForDinner, {});
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!pending) {
      setStage(0);
      return;
    }
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1400);
    return () => clearInterval(t);
  }, [pending]);

  const subtitle =
    itemCount > 0
      ? `3 ideas from your ${itemCount} item${itemCount === 1 ? "" : "s"}, expiring first`
      : "Ideas built from what's in your kitchen";

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-2xl bg-brand p-4 text-left text-brand-contrast shadow-xs transition duration-fast ease-out hover:bg-brand-ink active:scale-[0.99] disabled:opacity-70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-contrast/15">
          <Icon name="sparkles" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16.5px] font-semibold leading-tight">
            {pending ? "Thinking up dinner…" : "What's for dinner?"}
          </span>
          <span className="mt-1 block text-[12.5px] leading-snug text-brand-contrast/80">{subtitle}</span>
        </span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-brand-contrast/80" />
      </button>

      {pending && (
        <div className="mt-3 animate-slide-up-fade rounded-control border border-line bg-card p-3">
          <IndeterminateBar />
          <p className="mt-2 text-center text-[13px] text-muted" aria-live="polite">
            {STAGES[stage]}
          </p>
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-center text-[13px] text-status-critical-fg"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
