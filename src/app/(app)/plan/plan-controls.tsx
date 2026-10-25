"use client";

import { useState } from "react";
import { useActionState } from "react";
import { makePlan, type PlanState } from "./actions";
import { Button } from "@/components/ui/button";
import { IndeterminateBar, FormError } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const LENGTHS = [3, 7];

export function PlanControls() {
  const [state, action, pending] = useActionState<PlanState, FormData>(makePlan, {});
  const [days, setDays] = useState(3);

  return (
    <form action={action} className="flex flex-col gap-3">
      <fieldset>
        <legend className="mb-2 text-small font-medium text-ink">Plan length</legend>
        <div className="grid grid-cols-2 gap-2">
          {LENGTHS.map((n) => (
            <label
              key={n}
              className={cn(
                "flex min-h-[46px] cursor-pointer select-none items-center justify-center rounded-control border text-sm font-medium transition-colors duration-fast",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                days === n
                  ? "border-brand bg-brand text-brand-contrast"
                  : "border-line-strong bg-card text-muted hover:border-line hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="days"
                value={n}
                checked={days === n}
                onChange={() => setDays(n)}
                className="sr-only"
              />
              {n} days
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? "Planning…" : "Build the plan"}
      </Button>

      {pending && (
        <div className="animate-slide-up-fade rounded-control border border-line bg-card p-3">
          <IndeterminateBar />
          <p className="mt-2 text-center text-small text-muted">Building a plan from what you have…</p>
        </div>
      )}
      {state.error && (
        <FormError className="text-center">{state.error}</FormError>
      )}
    </form>
  );
}
