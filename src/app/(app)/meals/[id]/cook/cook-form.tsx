"use client";

import { useState } from "react";
import { useActionState } from "react";
import { cookRecipe, type CookState } from "./actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Checkbox } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { tidy } from "@/lib/units";
import { FormError } from "@/components/ui/feedback";
import { ActionBar } from "@/components/ui/action-bar";

export interface CookLine {
  inventoryItemId: string;
  itemName: string;
  itemQuantity: number;
  itemUnit: string;
  ingredientName: string;
  recipeQuantity: number | null;
  recipeUnit: string | null;
  suggestedUse: number;
  convertible: boolean;
  quantified: boolean;
}

/** What the recipe asks for, so nobody has to go back and check (PLAN 5.4). */
function recipeAsks(l: CookLine): string {
  if (!l.quantified || l.recipeQuantity == null) return `Recipe: ${l.ingredientName}, no amount given`;
  return `Recipe: ${tidy(l.recipeQuantity)}${l.recipeUnit ? ` ${l.recipeUnit}` : ""} ${l.ingredientName}`;
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
  // A line with no suggested amount starts unticked and empty: the cook decides.
  const [rows, setRows] = useState<Row[]>(
    initial.map((l) => ({ ...l, include: l.suggestedUse > 0, useQuantity: l.suggestedUse > 0 ? l.suggestedUse : null })),
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
                // Unticked rows stay readable: they may need an amount typed in.
                r.include ? "border-line" : "border-dashed border-line-strong bg-surface-2/60 shadow-none",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="-my-1.5 flex min-h-11 min-w-0 items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={r.include}
                    onChange={(e) => update(i, { include: e.target.checked })}
                  />
                  <span className="truncate font-semibold text-ink">{r.itemName}</span>
                </label>
                <span className="shrink-0 text-2xs text-muted tabular">
                  have {r.itemQuantity} {r.itemUnit}
                </span>
              </div>
              <p className="mt-1 pl-[28px] text-small leading-5 text-muted">{recipeAsks(r)}</p>

              <div className="mt-2.5 flex items-center gap-2 pl-[28px]">
                <span className="text-small text-muted">Use</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={r.itemQuantity}
                  inputMode="decimal"
                  aria-label={`Amount of ${r.itemName} to use, in ${r.itemUnit}`}
                  value={r.useQuantity ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    // Typing an amount means you used it.
                    update(i, v && v > 0 ? { useQuantity: v, include: true } : { useQuantity: v });
                  }}
                  className="h-11 w-28 rounded-control border border-line-strong bg-card px-3 text-body text-ink tabular focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <span className="text-small text-muted">{r.itemUnit}</span>
              </div>
              {(!r.convertible || !r.quantified) && (
                <p className="mt-1.5 pl-[28px] text-2xs leading-4 text-muted">
                  {r.convertible
                    ? "Enter how much you used, or leave it unticked."
                    : `We can't turn ${r.recipeUnit ?? "that"} into ${r.itemUnit}. Enter how much you used.`}
                </p>
              )}
            </div>
          ))}

          {state.error && (
            <FormError>{state.error}</FormError>
          )}

          <ActionBar>
            <Button type="submit" loading={pending} disabled={count === 0} size="lg" className="w-full">
              {pending ? "Updating inventory…" : `Cook & deduct ${count} item${count === 1 ? "" : "s"}`}
            </Button>
          </ActionBar>
        </form>
      )}
    </main>
  );
}
