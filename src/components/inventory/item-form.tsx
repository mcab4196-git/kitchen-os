"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { ItemFormState } from "@/app/(app)/inventory/actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input, Select, Checkbox, controlClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

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
  purchaseDate?: string;
  exactExpiryDate?: string;
  opened?: boolean;
  price?: number | null;
  currency?: string;
  notes?: string;
}

type ItemAction = (prev: ItemFormState, formData: FormData) => Promise<ItemFormState>;

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
    <main className="animate-fade-in">
      <PageHeader title={isEdit ? "Edit item" : "Add item"} back="/inventory" size="md" />

      <form action={formAction} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={initial.id} />}

        <Field label="Product name" hint="What's on the packaging, e.g. “Barilla Penne 500g”">
          <Input name="productName" required defaultValue={initial.productName} placeholder="Chicken breast" />
        </Field>

        <Field label="Ingredient" hint="Links to a known food so we can estimate expiry. Optional.">
          <Input
            name="ingredientName"
            list="ingredient-list"
            defaultValue={initial.ingredientName}
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
            <Input
              name="quantity"
              type="number"
              step="any"
              min="0"
              required
              defaultValue={initial.quantity}
              placeholder="500"
              inputMode="decimal"
            />
          </Field>
          <Field label="Unit">
            <Select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Storage">
            <Select name="storageLocation" defaultValue={initial.storageLocation ?? "REFRIGERATOR"}>
              {STORAGE.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchased">
            <Input name="purchaseDate" type="date" defaultValue={initial.purchaseDate ?? today} />
          </Field>
          <Field label="Expiry (if known)" hint="Leave blank to let us estimate.">
            <Input name="exactExpiryDate" type="date" defaultValue={initial.exactExpiryDate} />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-ink">
          <Checkbox name="opened" defaultChecked={initial.opened} />
          Already opened
        </label>

        <details className="group rounded-control border border-line bg-card px-3.5 py-2.5">
          <summary className="flex cursor-pointer items-center justify-between text-[13px] font-medium text-muted marker:content-['']">
            More — price, notes
            <Icon
              name="chevron-right"
              size={15}
              className="transition-transform duration-fast group-open:rotate-90"
            />
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Price">
              <Input name="price" type="number" step="any" min="0" inputMode="decimal" defaultValue={initial.price ?? undefined} />
            </Field>
            <Field label="Currency">
              <Input name="currency" defaultValue={initial.currency ?? "EUR"} />
            </Field>
          </div>
          <Field label="Notes" className="mt-3">
            <Input name="notes" defaultValue={initial.notes} className={cn(controlClass)} />
          </Field>
        </details>

        {state.error && (
          <p role="alert" className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg">
            {state.error}
          </p>
        )}

        <Button type="submit" loading={pending} size="lg" className="mt-1">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </form>
    </main>
  );
}
