"use client";

import { useState } from "react";
import { useActionState } from "react";
import { commitReceiptAction, type CommitState } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const UNITS = ["", "g", "kg", "ml", "l", "pcs", "clove", "slice", "tbsp", "tsp", "cup", "oz", "lb"];
const STORAGE = [
  ["REFRIGERATOR", "Fridge"],
  ["FREEZER", "Freezer"],
  ["PANTRY", "Pantry"],
  ["CUPBOARD", "Cupboard"],
  ["OTHER", "Other"],
] as const;

export interface ReviewRow {
  receiptItemId: string;
  rawName: string;
  include: boolean;
  productName: string;
  ingredientName: string;
  categoryId: string;
  quantity: number | null;
  unit: string;
  storageLocation: string;
  price: number | null;
  confidence: number;
}

type Category = { id: string; name: string };
type Ingredient = { id: string; name: string; categoryId: string | null; defaultUnit: string };

const cell =
  "min-h-11 w-full rounded-control border border-line-strong bg-card px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

const LOW_CONFIDENCE = 0.7;

// Lines that clearly aren't groceries. Presentation-only heuristic — the user
// can still tick any of them back on.
const NON_FOOD =
  /\b(carrier bag|bag for life|plastic bag|bag charge|deposit|donation|voucher|coupon|loyalty|points|charity|round ?up|postage|delivery|service charge|gift ?card)\b/i;

function isNonFood(name: string) {
  return NON_FOOD.test(name);
}

export function ReviewForm({
  receiptId,
  initialRows,
  categories,
  ingredients,
}: {
  receiptId: string;
  initialRows: ReviewRow[];
  categories: Category[];
  ingredients: Ingredient[];
}) {
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    initialRows.map((r) => (isNonFood(r.rawName) ? { ...r, include: false } : r)),
  );
  const [state, action, pending] = useActionState<CommitState, FormData>(commitReceiptAction, {});

  function update(i: number, patch: Partial<ReviewRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function onIngredient(i: number, name: string) {
    const match = ingredients.find((g) => g.name.toLowerCase() === name.trim().toLowerCase());
    update(i, {
      ingredientName: name,
      ...(match ? { unit: match.defaultUnit, categoryId: match.categoryId ?? "" } : {}),
    });
  }

  const includedCount = rows.filter((r) => r.include).length;
  const flaggedCount = rows.filter((r) => r.include && r.confidence < LOW_CONFIDENCE).length;

  return (
    <form action={action} className="flex flex-col gap-3 pb-24">
      <input type="hidden" name="receiptId" value={receiptId} />
      <input type="hidden" name="items" value={JSON.stringify(rows)} />

      <datalist id="rev-ingredients">
        {ingredients.map((g) => (
          <option key={g.id} value={g.name} />
        ))}
      </datalist>

      {flaggedCount > 0 && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-control border border-status-soon-border bg-status-soon-bg px-3.5 py-2.5 text-[12.5px] leading-relaxed text-status-soon-fg"
        >
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          <p>
            {flaggedCount} row{flaggedCount === 1 ? "" : "s"} need{flaggedCount === 1 ? "s" : ""} a
            check — the AI wasn&apos;t confident reading{" "}
            {flaggedCount === 1 ? "it" : "them"}. Fix anything wrong, then add.
          </p>
        </div>
      )}

      {rows.map((r, i) => {
        const low = r.confidence < LOW_CONFIDENCE;
        const nonFood = isNonFood(r.rawName);

        if (nonFood && !r.include) {
          return (
            <div
              key={r.receiptItemId}
              className="flex items-center gap-2.5 rounded-card border border-dashed border-line bg-card px-3.5 py-3"
            >
              <Checkbox
                checked={r.include}
                onChange={(e) => update(i, { include: e.target.checked })}
                aria-label={`Add ${r.rawName} to inventory`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-faint line-through">
                  {r.rawName}
                </span>
                <span className="block text-2xs text-faint">Not food — excluded</span>
              </span>
            </div>
          );
        }

        return (
          <div
            key={r.receiptItemId}
            className={cn(
              "rounded-card border bg-card p-3.5 shadow-card transition duration-fast ease-out",
              !r.include
                ? "border-dashed border-line opacity-55"
                : low
                  ? "border-status-soon-border border-l-4 border-l-status-soon"
                  : "border-line",
            )}
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 text-[13px]">
                <Checkbox checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} />
                <span className="text-muted">Add to inventory</span>
              </label>
              {low && (
                <Badge tone="soon" dot>
                  check this
                </Badge>
              )}
            </div>

            <input
              value={r.productName}
              onChange={(e) => update(i, { productName: e.target.value })}
              className={cn(cell, "mb-2 font-medium")}
              placeholder="Product name"
              aria-label="Product name"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={r.quantity ?? ""}
                onChange={(e) => update(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })}
                className={cn(cell, "tabular")}
                placeholder="Qty"
                aria-label="Quantity"
              />
              <select
                value={r.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                className={cell}
                aria-label="Unit"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u || "unit"}
                  </option>
                ))}
              </select>
            </div>

            <input
              list="rev-ingredients"
              value={r.ingredientName}
              onChange={(e) => onIngredient(i, e.target.value)}
              className={cn(cell, "mt-2")}
              placeholder="Ingredient (for expiry) — optional"
              aria-label="Ingredient"
            />

            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={r.categoryId}
                onChange={(e) => update(i, { categoryId: e.target.value })}
                className={cell}
                aria-label="Category"
              >
                <option value="">Category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={r.storageLocation}
                onChange={(e) => update(i, { storageLocation: e.target.value })}
                className={cell}
                aria-label="Storage"
              >
                {STORAGE.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {low && (
              <p className="mt-2 text-2xs leading-4 text-status-soon-fg">
                Read as “{r.rawName}” — check the name{r.quantity == null ? " and quantity" : ""}.
              </p>
            )}
          </div>
        );
      })}

      {state.error && (
        <p
          role="alert"
          className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg"
        >
          {state.error}
        </p>
      )}

      <div className="sticky bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+0.75rem)] z-10 -mx-4 border-t border-line bg-surface/85 px-4 py-3 backdrop-blur-md lg:bottom-4 lg:mx-0 lg:rounded-card lg:border">
        <Button type="submit" loading={pending} disabled={includedCount === 0} size="lg" className="w-full">
          {pending ? "Adding…" : `Add ${includedCount} item${includedCount === 1 ? "" : "s"} to inventory`}
        </Button>
      </div>
    </form>
  );
}
