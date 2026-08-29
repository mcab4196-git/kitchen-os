"use client";

import { useState } from "react";
import { useActionState } from "react";
import { consumeItem, type ItemFormState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

const QUICK: [string, number][] = [
  ["¼", 0.25],
  ["½", 0.5],
  ["¾", 0.75],
];

/** The quantity controls + submit for consuming an item. Shared by the full
 *  page and the quick-use sheet so the behaviour never drifts. */
export function ConsumeFields({
  id,
  currentQuantity,
  unit,
  autoFocus = false,
}: {
  id: string;
  currentQuantity: number;
  unit: string;
  autoFocus?: boolean;
}) {
  const [state, action, pending] = useActionState<ItemFormState, FormData>(consumeItem, {});
  const [qty, setQty] = useState(String(currentQuantity));
  const round = (n: number) => Math.round(n * 1000) / 1000;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="currentQuantity" value={currentQuantity} />

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-ink">How much did you use?</span>
        <div className="flex gap-2">
          <input
            name="useQuantity"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            autoFocus={autoFocus}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-11 flex-1 rounded-control border border-line-strong bg-card px-3 text-sm text-ink tabular focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <Select name="useUnit" defaultValue={unit} className="w-28" aria-label="Unit used">
            {[unit, "g", "kg", "ml", "l", "pcs"].filter((v, i, a) => a.indexOf(v) === i).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          {QUICK.map(([label, frac]) => (
            <button
              key={label}
              type="button"
              onClick={() => setQty(String(round(currentQuantity * frac)))}
              className="h-8 flex-1 rounded-control border border-line bg-card text-[13px] font-medium text-muted transition duration-fast ease-out hover:border-line-strong hover:text-ink active:scale-95"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setQty(String(currentQuantity))}
            className="h-8 flex-1 rounded-control border border-line bg-card text-[13px] font-medium text-muted transition duration-fast ease-out hover:border-line-strong hover:text-ink active:scale-95"
          >
            All
          </button>
        </div>
        <span className="text-2xs leading-4 text-muted">
          Different unit is fine — we&apos;ll convert (e.g. pcs → g when we know the piece weight).
        </span>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg"
        >
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={pending} size="lg" className="flex-1">
          {pending ? "Updating…" : "Deduct from inventory"}
        </Button>
        <Button type="submit" name="useAll" value="1" variant="secondary" size="lg" disabled={pending}>
          Use all
        </Button>
      </div>
    </form>
  );
}
