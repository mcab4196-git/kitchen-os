"use client";

import Link from "next/link";
import { useActionState } from "react";
import { consumeItem, type ItemFormState } from "../../actions";
import { Button } from "@/components/ui/button";

const field = "h-11 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand";

export function ConsumeForm({
  id,
  productName,
  currentQuantity,
  unit,
}: {
  id: string;
  productName: string;
  currentQuantity: number;
  unit: string;
}) {
  const [state, action, pending] = useActionState<ItemFormState, FormData>(consumeItem, {});

  return (
    <main>
      <header className="mb-5 flex items-center gap-3">
        <Link href="/inventory" className="text-sm text-muted hover:text-ink">
          ← Back
        </Link>
        <h1 className="font-display text-2xl text-ink">Use item</h1>
      </header>

      <div className="mb-5 rounded-2xl border border-line bg-card p-4 shadow-card">
        <p className="font-medium text-ink">{productName}</p>
        <p className="mt-0.5 text-sm text-muted">
          In stock: {currentQuantity} {unit}
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="currentQuantity" value={currentQuantity} />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">How much did you use?</span>
          <div className="flex gap-2">
            <input
              name="useQuantity"
              type="number"
              step="any"
              min="0"
              defaultValue={currentQuantity}
              className={`${field} flex-1`}
            />
            <select name="useUnit" defaultValue={unit} className={`${field} w-28`}>
              {[unit, "g", "kg", "ml", "l", "pcs"].filter((v, i, a) => a.indexOf(v) === i).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-muted">
            Different unit is fine — we&apos;ll convert (e.g. pcs → g when we know the piece weight).
          </span>
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-status-critical">
            {state.error}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          <Button type="submit" disabled={pending} className="flex-1 h-12">
            {pending ? "Updating…" : "Deduct from inventory"}
          </Button>
          <Button
            type="submit"
            name="useAll"
            value="1"
            variant="ghost"
            disabled={pending}
            className="h-12 border border-line"
          >
            Use all
          </Button>
        </div>
      </form>
    </main>
  );
}
