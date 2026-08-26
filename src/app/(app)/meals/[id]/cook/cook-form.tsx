"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { cookRecipe, type CookState } from "./actions";
import { Button } from "@/components/ui/button";

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

const field = "h-10 w-24 rounded-lg border border-line bg-card px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand";

export function CookForm({ recipeId, recipeName, initial }: { recipeId: string; recipeName: string; initial: CookLine[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((l) => ({ ...l, include: l.suggestedUse > 0, useQuantity: l.suggestedUse }))
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
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href={`/meals/${recipeId}`} className="text-sm text-muted hover:text-ink">
          ← Back
        </Link>
        <h1 className="font-display text-2xl text-ink">Cook &amp; deduct</h1>
      </header>

      <p className="mb-4 text-sm text-muted">
        Confirm what you used for <span className="font-medium text-ink">{recipeName}</span>. We&apos;ll subtract
        these from your inventory. Adjust amounts or untick anything you didn&apos;t use.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">None of this recipe&apos;s ingredients match your current inventory.</p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="recipeId" value={recipeId} />
          <input type="hidden" name="lines" value={JSON.stringify(payload)} />

          {rows.map((r, i) => (
            <div
              key={r.inventoryItemId}
              className={`rounded-2xl border bg-card p-3 shadow-card ${r.include ? "border-line" : "border-dashed border-line opacity-60"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => update(i, { include: e.target.checked })}
                    className="h-4 w-4 accent-[#2F5D50]"
                  />
                  <span className="font-medium text-ink">{r.itemName}</span>
                </label>
                <span className="text-xs text-muted">
                  have {r.itemQuantity} {r.itemUnit}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted">Use</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={r.itemQuantity}
                  value={r.useQuantity ?? ""}
                  onChange={(e) => update(i, { useQuantity: e.target.value === "" ? null : Number(e.target.value) })}
                  className={field}
                />
                <span className="text-sm text-muted">{r.itemUnit}</span>
                {!r.convertible && (
                  <span className="ml-1 rounded-full bg-status-soon/10 px-2 py-0.5 text-xs text-status-soon">
                    check amount
                  </span>
                )}
              </div>
            </div>
          ))}

          {state.error && (
            <p role="alert" className="text-sm text-status-critical">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending || count === 0} className="mt-2 h-12">
            {pending ? "Updating inventory…" : `Cook & deduct ${count} item${count === 1 ? "" : "s"}`}
          </Button>
        </form>
      )}
    </main>
  );
}
