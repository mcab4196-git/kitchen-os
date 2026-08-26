import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listInventory } from "@/server/services/inventory";
import { ItemCard } from "@/components/inventory/item-card";
import { InventoryControls } from "@/components/inventory/inventory-controls";
import { Button } from "@/components/ui/button";
import { restoreItem } from "./actions";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string; undo?: string; added?: string; cooked?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = await listInventory(user!.id, {
    q: sp.q,
    filter: sp.filter,
    sort: (sp.sort as "expiry" | "name" | "recent") ?? "expiry",
  });

  const hasQuery = Boolean(sp.q || (sp.filter && sp.filter !== "all"));

  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Inventory</h1>
        <Link href="/inventory/new">
          <Button className="h-10 px-3 text-sm">Add item</Button>
        </Link>
      </header>

      {sp.undo && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-brand-soft/50 px-4 py-3">
          <span className="text-sm text-brand-ink">Item removed.</span>
          <form action={restoreItem}>
            <input type="hidden" name="id" value={sp.undo} />
            <button type="submit" className="text-sm font-medium text-brand underline">
              Undo
            </button>
          </form>
        </div>
      )}

      {sp.cooked && (
        <div className="mb-4 rounded-xl border border-line bg-status-fresh/10 px-4 py-3 text-sm text-status-fresh">
          Cooked — updated {sp.cooked} ingredient{sp.cooked === "1" ? "" : "s"} in your inventory.
        </div>
      )}

      {sp.added && (
        <div className="mb-4 rounded-xl border border-line bg-status-fresh/10 px-4 py-3 text-sm text-status-fresh">
          Added {sp.added} item{sp.added === "1" ? "" : "s"} from your receipt.
        </div>
      )}

      <InventoryControls />

      {items.length === 0 ? (
        hasQuery ? (
          <p className="mt-10 text-center text-sm text-muted">No items match your search or filter.</p>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-line bg-brand-soft/40 p-8 text-center">
            <p className="font-display text-lg text-brand-ink">No items yet</p>
            <p className="mt-1 text-sm text-muted">
              Add your first item and we&apos;ll estimate when it needs using.
            </p>
            <Link href="/inventory/new" className="mt-4 inline-block">
              <Button>Add your first item</Button>
            </Link>
          </div>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}
