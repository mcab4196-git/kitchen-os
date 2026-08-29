import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listInventory } from "@/server/services/inventory";
import { ItemCard } from "@/components/inventory/item-card";
import { InventoryControls } from "@/components/inventory/inventory-controls";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";

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
    <main className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle={items.length > 0 ? `${items.length} item${items.length === 1 ? "" : "s"} in stock` : undefined}
        actions={
          <Button asChild size="sm">
            <Link href="/inventory/new">
              <Icon name="plus" size={16} />
              Add
            </Link>
          </Button>
        }
      />

      <InventoryControls />

      {items.length === 0 ? (
        hasQuery ? (
          <EmptyState
            icon="search"
            title="No matches"
            description="Nothing in your inventory matches that search or filter."
          />
        ) : (
          <EmptyState
            icon="inventory"
            title="No items yet"
            description="Add your first item and we'll estimate when it needs using."
            action={
              <Button asChild>
                <Link href="/inventory/new">Add your first item</Link>
              </Button>
            }
          />
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
