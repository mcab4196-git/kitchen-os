"use client";

import { useState } from "react";
import { useActionState } from "react";
import { consumeItem, type ItemFormState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const FRACTIONS: [string, string, number][] = [
  ["¼", "a quarter", 0.25],
  ["½", "half", 0.5],
  ["¾", "three quarters", 0.75],
  ["All", "all of it", 1],
];

/**
 * Quantity controls + submit for consuming an item. Shared by the full `/use`
 * page and the quick-use sheet so the behaviour never drifts. A 56px −/+ stepper
 * and fraction presets replace the bare number field; the remaining amount is
 * announced through a live region.
 */
export function ConsumeFields({
  id,
  currentQuantity,
  unit,
  storageLabel,
  autoFocus = false,
  onCancel,
}: {
  id: string;
  currentQuantity: number;
  unit: string;
  storageLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState<ItemFormState, FormData>(consumeItem, {});
  const [qty, setQty] = useState(String(currentQuantity));
  const [useUnit, setUseUnit] = useState(unit);
  const [fraction, setFraction] = useState<number | null>(1);

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const qtyNum = Number(qty);
  const valid = Number.isFinite(qtyNum) && qtyNum > 0;
  const sameUnit = useUnit === unit;
  const left = round(currentQuantity - qtyNum);
  const step = currentQuantity >= 100 ? 10 : currentQuantity >= 10 ? 1 : 0.25;

  function bump(dir: 1 | -1) {
    setFraction(null);
    setQty((q) => {
      const base = Number(q) || 0;
      return String(Math.max(0, Math.min(currentQuantity, round(base + dir * step))));
    });
  }

  function pickFraction(f: number) {
    setFraction(f);
    setUseUnit(unit);
    setQty(String(round(currentQuantity * f)));
  }

  const statusLine = !valid
    ? "Enter how much you used."
    : !sameUnit
      ? `We'll convert ${qty} ${useUnit} and deduct it.`
      : qtyNum >= currentQuantity
        ? "That uses all of it — the item comes off your inventory."
        : `${left} ${unit} will be left${storageLabel ? ` in the ${storageLabel.toLowerCase()}` : ""}.`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="currentQuantity" value={currentQuantity} />
      <input type="hidden" name="useUnit" value={useUnit} />

      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-ink">How much did you use?</span>
        <p className="text-2xs text-muted tabular">
          In stock: {currentQuantity} {unit}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => bump(-1)}
          aria-label="Less"
          disabled={qtyNum <= 0}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border border-line-strong bg-card text-ink transition duration-fast ease-out hover:border-brand active:scale-95 disabled:opacity-40"
        >
          <Icon name="minus" size={22} strokeWidth={2} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <input
            name="useQuantity"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            autoFocus={autoFocus}
            value={qty}
            onChange={(e) => {
              setFraction(null);
              setQty(e.target.value);
            }}
            aria-label="Amount to use"
            className="w-full min-w-0 bg-transparent text-center font-display text-title-lg text-ink tabular outline-none"
          />
          <span className="text-[13px] text-muted">{useUnit}</span>
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          aria-label="More"
          disabled={sameUnit && qtyNum >= currentQuantity}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border border-line-strong bg-card text-ink transition duration-fast ease-out hover:border-brand active:scale-95 disabled:opacity-40"
        >
          <Icon name="plus" size={22} strokeWidth={2} />
        </button>
      </div>

      <fieldset>
        <legend className="sr-only">Quick amount</legend>
        <div className="grid grid-cols-4 gap-2">
          {FRACTIONS.map(([glyph, label, f]) => (
            <label
              key={f}
              className={cn(
                "flex min-h-11 cursor-pointer select-none items-center justify-center rounded-control border text-[13.5px] font-medium transition-colors duration-fast",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                fraction === f
                  ? "border-brand bg-brand-soft text-brand-ink"
                  : "border-line bg-card text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="fraction"
                value={f}
                aria-label={label}
                checked={fraction === f}
                onChange={() => pickFraction(f)}
                className="sr-only"
              />
              {glyph}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>Measured in</span>
        <Select
          value={useUnit}
          onChange={(e) => {
            setUseUnit(e.target.value);
            setFraction(null);
          }}
          className="w-32"
          aria-label="Unit used"
        >
          {[unit, "g", "kg", "ml", "l", "pcs"]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
        </Select>
      </label>

      <p
        role="status"
        aria-live="polite"
        className="rounded-control border border-status-fresh-border bg-status-fresh-bg px-3.5 py-2.5 text-[13px] text-status-fresh-fg tabular"
      >
        {statusLine}
      </p>

      {state.error && (
        <p
          role="alert"
          className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg"
        >
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" size="lg" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={pending}
          disabled={!valid}
          size="lg"
          className={onCancel ? "flex-[2]" : "w-full"}
        >
          {pending ? "Updating…" : valid ? `Use ${qty} ${useUnit}` : "Use"}
        </Button>
      </div>
    </form>
  );
}
