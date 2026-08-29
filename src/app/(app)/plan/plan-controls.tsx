"use client";

import { useActionState } from "react";
import { makePlan, type PlanState } from "./actions";
import { Button } from "@/components/ui/button";
import { IndeterminateBar } from "@/components/ui/feedback";

export function PlanControls() {
  const [state, action, pending] = useActionState<PlanState, FormData>(makePlan, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-3">
        <Button type="submit" name="days" value="3" loading={pending} size="lg" className="flex-1">
          {pending ? "Planning…" : "Plan 3 days"}
        </Button>
        <Button
          type="submit"
          name="days"
          value="7"
          variant="secondary"
          loading={pending}
          size="lg"
          className="flex-1"
        >
          {pending ? "Planning…" : "Plan 7 days"}
        </Button>
      </div>
      {pending && (
        <div className="animate-slide-up-fade rounded-control border border-line bg-card p-3">
          <IndeterminateBar />
          <p className="mt-2 text-center text-[13px] text-muted">Building a plan from what you have…</p>
        </div>
      )}
      {state.error && (
        <p
          role="alert"
          className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-center text-[13px] text-status-critical-fg"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
