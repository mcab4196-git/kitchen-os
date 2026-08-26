"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import type { ItemFormState } from "@/app/(app)/inventory/actions";
import { Button } from "@/components/ui/button";

const UNITS = ["g", "kg", "ml", "l", "pcs", "clove", "slice", "tbsp", "tsp", "cup", "oz", "lb"];
const STORAGE = [
  ["REFRIGERATOR", "Fridge"],
  ["FREEZER", "Freezer"],
  ["PANTRY", "Pantry"],
  ["CUPBOARD", "Cupboard"],
  ["OTHER", "Other"],
] as const;

type Ingredient = { id: string; name: string; categoryId: string | null; defaultUnit: string };
type Category = { id: string; name: string };

export interface ItemFormInitial {
  id?: string;
  productName?: string;
  ingredientName?: string;
  categoryId?: string;
  quantity?: number;
  unit?: string;
  storageLocation?: string;
  purchaseDate?: string; // yyyy-mm-dd
  exactExpiryDate?: string; // yyyy-mm-dd
  opened?: boolean;
  price?: number | null;
  currency?: string;
  notes?: string;
}

type ItemAction = (prev: ItemFormState, formData: FormData) => Promise<ItemFormState>;

const field = "h-11 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand";
const today = new Date().toISOString().slice(0, 10);

export function ItemForm({
  action,
  categories,
  ingredients,
  initial = {},
  submitLabel = "Save to inventory",
}: {
  action: ItemAction;
  categories: Category[];
  ingredients: Ingredient[];
  initial?: ItemFormInitial;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(action, {});
  const [unit, setUnit] = useState(initial.unit ?? "g");
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");

  function onIngredientChange(name: string) {
    const match = ingredients.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
    if (match) {
      setUnit(match.defaultUnit);
      if (match.categoryId) setCategoryId(match.categoryId);
    }
  }

  const isEdit = Boolean(initial.id);

  return (
    <main>
      <header className="mb-5 flex items-center gap-3">
        <Link href="/inventory" className="text-sm text-muted hover:text-ink">
          ← Back
        </Link>
        <h1 className="font-display text-2xl text-ink">{isEdit ? "Edit item" : "Add item"}</h1>
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={initial.id} />}

        <Field label="Product name" hint="What's on the packaging, e.g. “Barilla Penne 500g”">
          <input name="productName" required defaultValue={initial.productName} className={field} placeholder="Chicken breast" />
        </Field>

        <Field label="Ingredient" hint="Links to a known food so we can estimate expiry. Optional.">
          <input
            name="ingredientName"
            list="ingredient-list"
            defaultValue={initial.ingredientName}
            className={field}
            placeholder="Start typing…"
            onChange={(e) => onIngredientChange(e.target.value)}
          />
          <datalist id="ingredient-list">
            {ingredients.map((i) => (
              <option key={i.id} value={i.name} />
            ))}
          </datalist>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input name="quantity" type="number" step="any" min="0" required defaultValue={initial.quantity} className={field} placeholder="500" />
          </Field>
          <Field label="Unit">
            <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={field}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Storage">
            <select name="storageLocation" defaultValue={initial.storageLocation ?? "REFRIGERATOR"} className={field}>
              {STORAGE.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchased">
            <input name="purchaseDate" type="date" defaultValue={initial.purchaseDate ?? today} className={field} />
          </Field>
          <Field label="Expiry (if known)" hint="Leave blank to let us estimate.">
            <input name="exactExpiryDate" type="date" defaultValue={initial.exactExpiryDate} className={field} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input name="opened" type="checkbox" defaultChecked={initial.opened} className="h-4 w-4 accent-[#2F5D50]" />
          Already opened
        </label>

        <details className="rounded-xl border border-line bg-card px-3 py-2">
          <summary className="cursor-pointer text-sm text-muted">More (price, notes)</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Price">
              <input name="price" type="number" step="any" min="0" defaultValue={initial.price ?? undefined} className={field} />
            </Field>
            <Field label="Currency">
              <input name="currency" defaultValue={initial.currency ?? "EUR"} className={field} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Notes">
              <input name="notes" defaultValue={initial.notes} className={field} />
            </Field>
          </div>
        </details>

        {state.error && (
          <p role="alert" className="text-sm text-status-critical">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-2 h-12">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </form>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
