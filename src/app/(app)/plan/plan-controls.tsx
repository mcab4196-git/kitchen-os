"use client";

import { useActionState } from "react";
import { makePlan, type PlanState } from "./actions";
import { Button } from "@/components/ui/button";

export function PlanControls() {
  const [state, action, pending] = useActionState<PlanState, FormData>(makePlan, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-3">
        <Button type="submit" name="days" value="3" variant="accent" disabled={pending} className="h-12 flex-1">
          {pending ? "Planning…" : "Plan 3 days"}
        </Button>
        <Button type="submit" name="days" value="7" disabled={pending} className="h-12 flex-1">
          {pending ? "Planning…" : "Plan 7 days"}
        </Button>
      </div>
      {pending && <p className="text-center text-xs text-muted">Building a plan from what you have…</p>}
      {state.error && (
        <p role="alert" className="text-center text-sm text-status-critical">
          {state.error}
        </p>
      )}
    </form>
  );
}
