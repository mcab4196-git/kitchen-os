"use client";

import { useActionState } from "react";
import { whatsForDinner, type MealsState } from "./actions";
import { IndeterminateBar } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

export function DinnerButton({ itemCount = 0 }: { itemCount?: number }) {
  const [state, action, pending] = useActionState<MealsState, FormData>(whatsForDinner, {});

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
          <span className="block text-[1.03125rem] font-semibold leading-tight">
            {pending ? "Thinking up dinner…" : "What's for dinner?"}
          </span>
          <span className="mt-1 block text-small leading-snug text-brand-contrast/80">{subtitle}</span>
        </span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-brand-contrast/80" />
      </button>

      {pending && (
        <div className="mt-3 animate-slide-up-fade rounded-control border border-line bg-card p-3">
          <IndeterminateBar />
          {/* PLAN 5.6: one honest line, announced once. The old timed steps invented progress
              and were read out every 1.4 s. */}
          <p className="mt-2 text-center text-small text-muted" role="status">
            Checking your saved recipes, then asking the AI for the rest. This usually takes under 30 seconds.
          </p>
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-center text-small text-status-critical-fg"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
