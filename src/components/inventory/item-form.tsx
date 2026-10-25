"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import type { ItemFormState } from "@/app/(app)/inventory/actions";
import { previewEstimate, type EstimatePreview } from "@/app/(app)/inventory/estimate-actions";
import type { RecentItemChip } from "@/server/services/inventory";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input, Select, Checkbox } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/ui/feedback";
import { ActionBar } from "@/components/ui/action-bar";
import { SectionLabel } from "@/components/ui/section-label";

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

/**
 * Today on the device, as yyyy-mm-dd. toISOString() gives the UTC date, which is
 * yesterday in Manila before 8 AM (PLAN 5.6).
 */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysPhrase(p: Extract<EstimatePreview, { ok: true }>) {
  if (p.minDays === p.maxDays) return `${p.maxDays} day${p.maxDays === 1 ? "" : "s"}`;
  return `${p.minDays}–${p.maxDays} days`;
}

export function ItemForm({
  action,
  categories,
  ingredients,
  initial = {},
  recent = [],
  submitLabel = "Save to inventory",
}: {
  action: ItemAction;
  categories: Category[];
  ingredients: Ingredient[];
  initial?: ItemFormInitial;
  recent?: RecentItemChip[];
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(action, {});

  const [productName, setProductName] = useState(initial.productName ?? "");
  const [ingredientName, setIngredientName] = useState(initial.ingredientName ?? "");
  const [ingredientId, setIngredientId] = useState<string | null>(
    () =>
      ingredients.find(
        (i) => i.name.toLowerCase() === (initial.ingredientName ?? "").trim().toLowerCase(),
      )?.id ?? null,
  );
  const [quantity, setQuantity] = useState(initial.quantity != null ? String(initial.quantity) : "");
  const [unit, setUnit] = useState(initial.unit ?? "g");
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [storage, setStorage] = useState(initial.storageLocation ?? "REFRIGERATOR");
  const [opened, setOpened] = useState(initial.opened ?? false);
  const [purchaseDate, setPurchaseDate] = useState(initial.purchaseDate ?? "");
  // Filled in after hydration: the server's clock and timezone aren't the phone's.
  useEffect(() => {
    if (!initial.purchaseDate) setPurchaseDate(localToday());
  }, [initial.purchaseDate]);
  const [exactDate, setExactDate] = useState(initial.exactExpiryDate ?? "");

  const [preview, setPreview] = useState<EstimatePreview | null>(null);

  const matchedIngredientName = ingredientId
    ? (ingredients.find((i) => i.id === ingredientId)?.name ?? null)
    : null;

  function onIngredientChange(name: string) {
    setIngredientName(name);
    const match = ingredients.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
    setIngredientId(match?.id ?? null);
    if (match) {
      setUnit(match.defaultUnit);
      if (match.categoryId) setCategoryId(match.categoryId);
    }
  }

  function applyChip(r: RecentItemChip) {
    setProductName(r.productName);
    setIngredientName(r.ingredientName ?? "");
    setIngredientId(
      ingredients.find((i) => i.name.toLowerCase() === (r.ingredientName ?? "").toLowerCase())?.id ??
        null,
    );
    setQuantity(String(r.quantity));
    setUnit(r.unit);
    setCategoryId(r.categoryId ?? "");
    setStorage(r.storageLocation);
  }

  // Live, honest expiry preview — debounced, and only while the expiry field is
  // blank. Never shows a date the save wouldn't also produce.
  useEffect(() => {
    if (exactDate) {
      setPreview(null);
      return;
    }
    if (!ingredientName.trim() && !categoryId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      previewEstimate({
        ingredientId,
        ingredientName,
        categoryId,
        storageLocation: storage,
        opened,
        purchaseDate,
      }).then((res) => {
        if (!cancelled) setPreview(res);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ingredientId, ingredientName, categoryId, storage, opened, purchaseDate, exactDate]);

  const isEdit = Boolean(initial.id);

  return (
    <main className="animate-fade-in">
      <PageHeader title={isEdit ? "Edit item" : "Add item"} back="/inventory" size="md" />

      {recent.length > 0 && (
        <div className="mb-5">
          <SectionLabel as="p" className="mb-2">
            Quick add from your usuals
          </SectionLabel>
          <div className="no-scrollbar edge-fade-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
            {recent.map((r, i) => (
              <button
                key={`${r.productName}-${i}`}
                type="button"
                onClick={() => applyChip(r)}
                className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-line bg-card px-3.5 text-small font-medium text-ink transition duration-fast ease-out hover:border-line-strong active:scale-95"
              >
                {r.productName}
                <span className="ml-1.5 text-muted tabular">
                  {r.quantity} {r.unit}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={initial.id} />}

        <Field
          label="Product name"
          htmlFor="productName"
          hint="What's on the packaging, e.g. “Barilla Penne 500g”"
        >
          <Input
            id="productName"
            name="productName"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Chicken breast"
          />
        </Field>

        <Field
          label="Ingredient"
          htmlFor="ingredientName"
          hint={
            matchedIngredientName
              ? undefined
              : "Links to a known food so we can estimate expiry. Optional."
          }
        >
          <Input
            id="ingredientName"
            name="ingredientName"
            list="ingredient-list"
            value={ingredientName}
            placeholder="Start typing…"
            onChange={(e) => onIngredientChange(e.target.value)}
          />
          <datalist id="ingredient-list">
            {ingredients.map((i) => (
              <option key={i.id} value={i.name} />
            ))}
          </datalist>
          {matchedIngredientName && (
            <p className="text-2xs leading-4 text-muted">
              Matched to ingredient{" "}
              <strong className="font-medium text-ink">{matchedIngredientName}</strong> — used for
              shelf life and recipes.
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" htmlFor="quantity">
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="500"
              inputMode="decimal"
            />
          </Field>
          <Field label="Unit" htmlFor="unit">
            <Select id="unit" name="unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-0.5 text-small font-medium text-ink">Where is it?</legend>
          <div className="grid grid-cols-2 gap-2">
            {STORAGE.map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  "flex min-h-[46px] cursor-pointer select-none items-center justify-center rounded-control border text-sm font-medium transition-colors duration-fast",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                  storage === value
                    ? "border-brand bg-brand text-brand-contrast"
                    : "border-line-strong bg-card text-muted hover:border-line hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  name="storageLocation"
                  value={value}
                  checked={storage === value}
                  onChange={() => setStorage(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Expiry date" htmlFor="exactExpiryDate" hint="Leave blank to let us estimate.">
          <Input
            id="exactExpiryDate"
            name="exactExpiryDate"
            type="date"
            value={exactDate}
            onChange={(e) => setExactDate(e.target.value)}
          />
          {!exactDate && preview?.ok && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-control border border-line bg-surface-2 px-3.5 py-3 text-small leading-relaxed text-ink"
            >
              <Icon name="clock" size={15} className="mt-0.5 shrink-0" />
              <p>
                Left blank we&apos;ll estimate{" "}
                <strong className="font-semibold">{shortDate(preview.expiryDateISO)}</strong>{" "}
                <span className="text-muted">(est.)</span> — {daysPhrase(preview)} for{" "}
                {preview.matchedIngredient ?? "this item"} in the {preview.storageLabel}. It stays
                marked <strong className="font-semibold">(est.)</strong> until you set a real date.
              </p>
            </div>
          )}
        </Field>

        <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
          <Checkbox
            name="opened"
            checked={opened}
            onChange={(e) => setOpened(e.target.checked)}
          />
          Already opened{" "}
          <span className="text-muted">— shortens the estimate</span>
        </label>

        <details className="group rounded-control border border-line bg-card px-3.5 py-2.5">
          <summary className="flex cursor-pointer items-center justify-between text-small font-medium text-muted marker:content-['']">
            More — purchase date, category, price, notes
            <Icon
              name="chevron-right"
              size={15}
              className="transition-transform duration-fast group-open:rotate-90"
            />
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Purchased" htmlFor="purchaseDate">
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </Field>
            <Field label="Category" htmlFor="categoryId">
              <Select
                id="categoryId"
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Price" htmlFor="price">
              <Input
                id="price"
                name="price"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                defaultValue={initial.price ?? undefined}
              />
            </Field>
            <Field label="Currency" htmlFor="currency">
              <Input id="currency" name="currency" defaultValue={initial.currency ?? "PHP"} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="notes" className="mt-3">
            <Input id="notes" name="notes" defaultValue={initial.notes} />
          </Field>
        </details>

        {state.error && (
          <FormError>{state.error}</FormError>
        )}

        <ActionBar className="mt-2">
          <Button type="submit" loading={pending} size="lg" className="w-full">
            {pending ? "Saving…" : submitLabel}
          </Button>
          <p className="mt-1.5 text-center text-2xs text-muted">
            Saves and returns to your inventory.
          </p>
        </ActionBar>
      </form>
    </main>
  );
}
