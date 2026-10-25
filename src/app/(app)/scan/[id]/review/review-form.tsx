"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { commitReceiptAction, type CommitState } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EXPIRY_WORD } from "@/components/inventory/expiry-badge";
import { EXPIRY_TEXT } from "@/components/inventory/freshness-bar";
import { classifyStatus, relativeLabel, type ShelfLifeRuleish, type StorageLocation } from "@/lib/expiry";
import { inferStorage, isNonFood, lineEstimate, type ReviewRef } from "@/lib/review";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/ui/feedback";
import { ActionBar } from "@/components/ui/action-bar";

const UNITS = ["", "g", "kg", "ml", "l", "pcs", "clove", "slice", "tbsp", "tsp", "cup", "oz", "lb"];
const STORAGE: readonly (readonly [StorageLocation, string])[] = [
  ["REFRIGERATOR", "Fridge"],
  ["FREEZER", "Freezer"],
  ["PANTRY", "Pantry"],
  ["CUPBOARD", "Cupboard"],
  ["OTHER", "Other"],
];
const STORAGE_LABEL = Object.fromEntries(STORAGE) as Record<StorageLocation, string>;

export interface ReviewRow {
  receiptItemId: string;
  rawName: string;
  include: boolean;
  productName: string;
  ingredientName: string;
  categoryId: string;
  quantity: number | null;
  unit: string;
  storageLocation: StorageLocation;
  price: number | null;
  confidence: number;
}

const cell =
  "min-h-11 w-full rounded-control border border-line-strong bg-card px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

const LOW_CONFIDENCE = 0.7;

/**
 * PLAN 5.4: Review is for checking, not data entry. Each line is one row (name,
 * amount, where it goes, the expiry it will get); its fields open only when the AI
 * wasn't sure or you tap Edit.
 */
export function ReviewForm({
  receiptId,
  initialRows,
  reference,
  rules,
  purchaseDateISO,
  ingredientUnits,
}: {
  receiptId: string;
  initialRows: ReviewRow[];
  reference: ReviewRef;
  rules: ShelfLifeRuleish[];
  purchaseDateISO: string;
  ingredientUnits: Record<string, string>;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    initialRows.map((r) => (isNonFood(r.rawName) ? { ...r, include: false } : r)),
  );
  // Lines the AI wasn't sure about start open; the rest stay one row each.
  const [open, setOpen] = useState<Set<string>>(
    () =>
      new Set(
        initialRows
          .filter((r) => r.confidence < LOW_CONFIDENCE && !isNonFood(r.rawName))
          .map((r) => r.receiptItemId),
      ),
  );
  // Once you choose where a line goes, a later ingredient or category change won't move it.
  const [storageChosen, setStorageChosen] = useState<Set<string>>(() => new Set());
  const [state, action, pending] = useActionState<CommitState, FormData>(commitReceiptAction, {});

  // PLAN 5.6: a phone call or a reload shouldn't wipe your corrections. The draft lives in
  // this tab only (sessionStorage), and only a draft for exactly these lines is restored.
  const draftKey = `kitchen-os:review:${receiptId}`;
  // Saved only after you change something, so a fresh render never overwrites a draft.
  const dirty = useRef(false);
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as {
        rows?: ReviewRow[];
        chosen?: string[];
      } | null;
      const ids = initialRows.map((r) => r.receiptItemId).join();
      if (draft?.rows && draft.rows.map((r) => r.receiptItemId).join() === ids) {
        setRows(draft.rows);
        setStorageChosen(new Set(draft.chosen ?? []));
      }
    } catch {
      // Storage blocked or an old draft: start from the receipt.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty.current) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ rows, chosen: [...storageChosen] }));
    } catch {
      // Full or blocked storage only costs the draft.
    }
  }, [draftKey, rows, storageChosen]);

  const purchaseDate = new Date(purchaseDateISO);
  const now = new Date();

  function update(i: number, patch: Partial<ReviewRow>) {
    dirty.current = true;
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function toggle(id: string) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** A category change moves the line to that category's usual place, unless you chose one. */
  function withStorage(r: ReviewRow, patch: Partial<ReviewRow>): Partial<ReviewRow> {
    if (storageChosen.has(r.receiptItemId)) return patch;
    return { ...patch, storageLocation: inferStorage({ ...r, ...patch }, reference) };
  }

  function onIngredient(i: number, name: string) {
    const r = rows[i];
    const match = reference.ingredients.find((g) => g.name.toLowerCase() === name.trim().toLowerCase());
    update(
      i,
      withStorage(r, {
        ingredientName: name,
        ...(match ? { unit: ingredientUnits[match.name] ?? r.unit, categoryId: match.categoryId ?? "" } : {}),
      }),
    );
  }

  function chooseStorage(i: number, storageLocation: StorageLocation) {
    setStorageChosen((s) => new Set(s).add(rows[i].receiptItemId));
    update(i, { storageLocation });
  }

  function putAllIn(storageLocation: StorageLocation) {
    dirty.current = true;
    setRows((rs) => rs.map((r) => (r.include ? { ...r, storageLocation } : r)));
    setStorageChosen(new Set(rows.filter((r) => r.include).map((r) => r.receiptItemId)));
  }

  const includedCount = rows.filter((r) => r.include).length;
  const flaggedCount = rows.filter((r) => r.include && r.confidence < LOW_CONFIDENCE).length;
  // Only ticked lines go to the server, so an unticked line with no name can't block the rest.
  const payload = rows.filter((r) => r.include);

  return (
    <form action={action} className="flex flex-col gap-3 pb-24">
      <input type="hidden" name="receiptId" value={receiptId} />
      <input type="hidden" name="items" value={JSON.stringify(payload)} />

      <datalist id="rev-ingredients">
        {reference.ingredients.map((g) => (
          <option key={g.id} value={g.name} />
        ))}
      </datalist>

      {flaggedCount > 0 && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-control border border-line-strong bg-surface-2 px-3.5 py-2.5 text-small leading-5 text-ink"
        >
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          <p>
            {flaggedCount} line{flaggedCount === 1 ? "" : "s"} need{flaggedCount === 1 ? "s" : ""} a check: the AI
            wasn&apos;t sure how to read {flaggedCount === 1 ? "it" : "them"}. {flaggedCount === 1 ? "It's" : "They're"}{" "}
            open below.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-small text-muted tabular">
          {includedCount} of {rows.length} ticked
        </p>
        <label className="flex items-center gap-2 text-small text-muted">
          Put all in
          <select
            value=""
            onChange={(e) => e.target.value && putAllIn(e.target.value as StorageLocation)}
            className="min-h-11 rounded-control border border-line-strong bg-card px-2.5 text-small text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          >
            <option value="">Choose…</option>
            {STORAGE.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Receipt lines">
        {rows.map((r, i) => {
          const low = r.confidence < LOW_CONFIDENCE;
          const name = r.productName.trim() || r.rawName;

          if (isNonFood(r.rawName) && !r.include) {
            return (
              <li
                key={r.receiptItemId}
                className="rounded-card border border-dashed border-line-strong bg-surface-2/60 px-3.5"
              >
                <label className="flex min-h-11 items-center gap-2.5 py-1.5">
                  <Checkbox checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-medium text-muted line-through">{r.rawName}</span>
                    <span className="block text-2xs text-muted">Not food, left out. Tick to add it anyway.</span>
                  </span>
                </label>
              </li>
            );
          }

          const est = lineEstimate(r, reference, rules, purchaseDate);
          const status = classifyStatus(est.expiryDate, est.source, now);
          const isOpen = open.has(r.receiptItemId);
          const panelId = `line-${r.receiptItemId}`;

          return (
            <li
              key={r.receiptItemId}
              className={cn(
                "rounded-card border bg-card shadow-card transition-colors duration-fast",
                !r.include
                  ? "border-dashed border-line-strong bg-surface-2/60 shadow-none"
                  : low
                    ? "border-line-strong"
                    : "border-line",
              )}
            >
              <div className="flex items-center gap-2 pl-3.5 pr-1.5 pt-1">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5">
                  <Checkbox checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} />
                  <span className="min-w-0 truncate text-body font-semibold text-ink">{name}</span>
                </label>
                {low && (
                  <Badge tone="neutral" className="shrink-0">
                    <Icon name="alert" size={12} />
                    Check this
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => toggle(r.receiptItemId)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="inline-flex h-11 shrink-0 items-center gap-1 rounded-control px-2.5 text-small font-medium text-brand transition-colors duration-fast hover:bg-brand-soft"
                >
                  {isOpen ? "Done" : "Edit"}
                  <span className="sr-only"> {name}</span>
                  <Icon
                    name="chevron-right"
                    size={14}
                    className={cn("transition-transform duration-fast", isOpen && "rotate-90")}
                  />
                </button>
              </div>

              {/* What will be saved: the commit stores 1 pcs when the amount is blank. */}
              <p className="flex flex-wrap gap-x-1.5 pb-3 pl-[42px] pr-3.5 text-small leading-5 text-muted tabular">
                <span>
                  {r.quantity ?? 1} {r.unit || "pcs"}
                </span>
                <span aria-hidden>·</span>
                <span>{STORAGE_LABEL[r.storageLocation]}</span>
                <span aria-hidden>·</span>
                <span className={cn("font-medium", EXPIRY_TEXT[status])}>
                  {status === "UNKNOWN"
                    ? "No date yet"
                    : `${EXPIRY_WORD[status]} · ${relativeLabel(est.expiryDate, est.source, now)} est.`}
                </span>
              </p>

              {isOpen && (
                <fieldset id={panelId} className="border-t border-line px-3.5 pb-3.5 pt-3">
                  <legend className="sr-only">Change {r.rawName}</legend>
                  {low && (
                    <p className="mb-2.5 text-small leading-5 text-ink">
                      Read as “{r.rawName}”. Check the name{r.quantity == null ? " and the amount" : ""}.
                    </p>
                  )}

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
                      onChange={(e) =>
                        update(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      className={cn(cell, "tabular")}
                      placeholder="Amount"
                      aria-label="Amount"
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
                    placeholder="Ingredient, for the expiry estimate"
                    aria-label="Ingredient"
                  />

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={r.categoryId}
                      onChange={(e) => update(i, withStorage(r, { categoryId: e.target.value }))}
                      className={cell}
                      aria-label="Category"
                    >
                      <option value="">Category —</option>
                      {reference.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={r.storageLocation}
                      onChange={(e) => chooseStorage(i, e.target.value as StorageLocation)}
                      className={cell}
                      aria-label="Where it goes"
                    >
                      {STORAGE.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  {status === "UNKNOWN" && (
                    <p className="mt-2 text-2xs leading-4 text-muted">
                      Pick an ingredient or a category to get an expiry estimate.
                    </p>
                  )}
                </fieldset>
              )}
            </li>
          );
        })}
      </ul>

      {state.error && (
        <FormError>{state.error}</FormError>
      )}

      <ActionBar>
        <Button type="submit" loading={pending} disabled={includedCount === 0} size="lg" className="w-full">
          {pending ? "Adding…" : `Add ${includedCount} item${includedCount === 1 ? "" : "s"} to inventory`}
        </Button>
      </ActionBar>
    </form>
  );
}
