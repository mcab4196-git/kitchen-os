"use client";

import { useState } from "react";
import { useActionState } from "react";
import { commitReceiptAction, type CommitState } from "./actions";
import { Button } from "@/components/ui/button";

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

const field =
  "h-10 w-full rounded-lg border border-line bg-card px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand";

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
  const [rows, setRows] = useState<ReviewRow[]>(initialRows);
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

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="receiptId" value={receiptId} />
      <input type="hidden" name="items" value={JSON.stringify(rows)} />

      <datalist id="rev-ingredients">
        {ingredients.map((g) => (
          <option key={g.id} value={g.name} />
        ))}
      </datalist>

      {rows.map((r, i) => {
        const low = r.confidence < 0.7;
        return (
          <div
            key={r.receiptItemId}
            className={`rounded-2xl border bg-card p-3 shadow-card ${
              r.include ? "border-line" : "border-dashed border-line opacity-60"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => update(i, { include: e.target.checked })}
                  className="h-4 w-4 accent-[#2F5D50]"
                />
                <span className="text-muted">Add</span>
              </label>
              {low && (
                <span className="rounded-full bg-status-soon/10 px-2 py-0.5 text-xs font-medium text-status-soon">
                  check this
                </span>
              )}
            </div>

            <input
              value={r.productName}
              onChange={(e) => update(i, { productName: e.target.value })}
              className={`${field} mb-2 font-medium`}
              placeholder="Product name"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                min="0"
                value={r.quantity ?? ""}
                onChange={(e) => update(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })}
                className={field}
                placeholder="Qty"
              />
              <select value={r.unit} onChange={(e) => update(i, { unit: e.target.value })} className={field}>
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
              className={`${field} mt-2`}
              placeholder="Ingredient (for expiry) — optional"
            />

            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={r.categoryId}
                onChange={(e) => update(i, { categoryId: e.target.value })}
                className={field}
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
                className={field}
              >
                {STORAGE.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}

      {state.error && (
        <p role="alert" className="text-sm text-status-critical">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || includedCount === 0} className="sticky bottom-24 h-12">
        {pending ? "Adding…" : `Add ${includedCount} item${includedCount === 1 ? "" : "s"} to inventory`}
      </Button>
    </form>
  );
}
