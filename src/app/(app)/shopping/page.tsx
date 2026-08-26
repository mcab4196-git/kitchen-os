import { createClient } from "@/lib/supabase/server";
import { listShopping } from "@/server/services/shopping";
import { Button } from "@/components/ui/button";
import {
  addItemAction,
  toggleCheckedAction,
  removeItemAction,
  clearCheckedAction,
} from "./actions";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { items } = await listShopping(user!.id);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Shopping</h1>
        {checkedCount > 0 && (
          <form action={clearCheckedAction}>
            <button className="text-sm text-muted hover:text-status-critical">Clear checked ({checkedCount})</button>
          </form>
        )}
      </header>

      {added && (
        <div className="mb-4 rounded-xl border border-line bg-status-fresh/10 px-4 py-3 text-sm text-status-fresh">
          Added {added} item{added === "1" ? "" : "s"} from the recipe.
        </div>
      )}

      <form action={addItemAction} className="mb-4 flex gap-2">
        <input
          name="label"
          required
          placeholder="Add an item…"
          className="h-11 flex-1 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
        />
        <Button type="submit" className="h-11 px-4">
          Add
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          Your list is empty. Add items here, or add a recipe&apos;s missing ingredients from its page.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className={`flex items-center gap-3 rounded-xl border border-line bg-card p-3 ${it.checked ? "opacity-60" : ""}`}
            >
              <form action={toggleCheckedAction}>
                <input type="hidden" name="itemId" value={it.id} />
                <button
                  type="submit"
                  aria-label={it.checked ? "Uncheck" : "Check off"}
                  className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                    it.checked ? "border-brand bg-brand text-white" : "border-line"
                  }`}
                >
                  {it.checked ? "✓" : ""}
                </button>
              </form>

              <div className="min-w-0 flex-1">
                <span className={`text-sm text-ink ${it.checked ? "line-through" : ""}`}>
                  {it.quantityNeeded ? `${it.quantityNeeded} ` : ""}
                  {it.unit ? `${it.unit} ` : ""}
                  {it.label}
                </span>
                {it.reason === "RECIPE" && (
                  <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-ink">recipe</span>
                )}
              </div>

              <form action={removeItemAction}>
                <input type="hidden" name="itemId" value={it.id} />
                <button type="submit" aria-label="Remove" className="text-muted hover:text-status-critical">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
