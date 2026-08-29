"use client";

import { useState } from "react";
import { useActionState } from "react";
import { cookRecipe, type CookState } from "./actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Checkbox } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CookLine {
  inventoryItemId: string;
  itemName: string;
  itemQuantity: number;
  itemUnit: string;
  ingredientName: string;
  suggestedUse: number;
  convertible: boolean;
}

interface Row extends CookLine {
  include: boolean;
  useQuantity: number | null;
}

export function CookForm({
  recipeId,
  recipeName,
  initial,
}: {
  recipeId: string;
  recipeName: string;
  initial: CookLine[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((l) => ({ ...l, include: l.suggestedUse > 0, useQuantity: l.suggestedUse })),
  );
  const [state, action, pending] = useActionState<CookState, FormData>(cookRecipe, {});

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const payload = rows.map((r) => ({
    inventoryItemId: r.inventoryItemId,
    include: r.include,
    useQuantity: r.useQuantity,
    useUnit: r.itemUnit,
  }));
  const count = rows.filter((r) => r.include && (r.useQuantity ?? 0) > 0).length;

  return (
    <main className="animate-fade-in pb-24">
      <PageHeader title="Cook & deduct" back={`/meals/${recipeId}`} size="md" />

      <p className="mb-4 text-sm leading-6 text-muted">
        Confirm what you used for <span className="font-semibold text-ink">{recipeName}</span>. We&apos;ll
        subtract these from your inventory — adjust amounts or untick anything you didn&apos;t use.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong bg-surface-2/60 p-6 text-center text-sm text-muted">
          None of this recipe&apos;s ingredients match your current inventory.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="recipeId" value={recipeId} />
          <input type="hidden" name="lines" value={JSON.stringify(payload)} />

          {rows.map((r, i) => (
            <div
              key={r.inventoryItemId}
              className={cn(
                "rounded-card border bg-card p-3.5 shadow-card transition duration-fast ease-out",
                r.include ? "border-line" : "border-dashed border-line opacity-55",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={r.include}
                    onChange={(e) => update(i, { include: e.target.checked })}
                  />
                  <span className="font-semibold text-ink">{r.itemName}</span>
                </label>
                <span className="text-2xs text-muted tabular">
                  have {r.itemQuantity} {r.itemUnit}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-[13px] text-muted">Use</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={r.itemQuantity}
                  inputMode="decimal"
                  value={r.useQuantity ?? ""}
                  onChange={(e) =>
                    update(i, { useQuantity: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="h-9 w-24 rounded-control border border-line-strong bg-card px-2.5 text-sm text-ink tabular focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <span className="text-[13px] text-muted">{r.itemUnit}</span>
                {!r.convertible && (
                  <Badge tone="soon" className="ml-1">
                    check amount
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {state.error && (
            <p
              role="alert"
              className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg"
            >
              {state.error}
            </p>
          )}

          <div className="sticky bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+0.75rem)] z-10 -mx-4 border-t border-line bg-surface/85 px-4 py-3 backdrop-blur-md lg:bottom-4 lg:mx-0 lg:rounded-card lg:border">
            <Button type="submit" loading={pending} disabled={count === 0} size="lg" className="w-full">
              {pending ? "Updating inventory…" : `Cook & deduct ${count} item${count === 1 ? "" : "s"}`}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}
