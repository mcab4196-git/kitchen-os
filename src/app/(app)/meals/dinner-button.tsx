"use client";

import { useActionState } from "react";
import { whatsForDinner, type MealsState } from "./actions";
import { Button } from "@/components/ui/button";

export function DinnerButton() {
  const [state, action, pending] = useActionState<MealsState, FormData>(whatsForDinner, {});
  return (
    <form action={action}>
      <Button type="submit" variant="accent" disabled={pending} className="h-14 w-full text-base">
        {pending ? "Thinking up dinner…" : "What's for dinner?"}
      </Button>
      {pending && (
        <p className="mt-2 text-center text-xs text-muted">Reading your inventory and cooking up ideas…</p>
      )}
      {state.error && (
        <p role="alert" className="mt-2 text-center text-sm text-status-critical">
          {state.error}
        </p>
      )}
    </form>
  );
}
