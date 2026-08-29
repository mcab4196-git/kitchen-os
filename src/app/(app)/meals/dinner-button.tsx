"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { whatsForDinner, type MealsState } from "./actions";
import { Button } from "@/components/ui/button";
import { IndeterminateBar } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

const STAGES = [
  "Reading your inventory…",
  "Matching against saved recipes…",
  "Asking the AI to fill the gaps…",
  "Checking allergies and dislikes…",
  "Writing it up…",
];

export function DinnerButton() {
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

  return (
    <form action={action}>
      <Button type="submit" loading={pending} size="lg" className="h-14 w-full text-[15px]">
        <Icon name="sparkles" size={18} />
        {pending ? "Thinking up dinner…" : "What's for dinner?"}
      </Button>

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
