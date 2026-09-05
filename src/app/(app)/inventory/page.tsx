import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listInventory } from "@/server/services/inventory";
import { ItemCard } from "@/components/inventory/item-card";
import { ItemRow } from "@/components/inventory/item-row";
import { InventoryControls } from "@/components/inventory/inventory-controls";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PrimaryAction } from "@/components/ui/primary-action";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { getPreferences, accessibilityPrefs } from "@/server/services/preferences";
import { classifyStatus, type ExpirySource, type ExpiryStatus } from "@/lib/expiry";

type BucketTone = "critical" | "soon" | "fresh" | "unknown";

const BUCKETS: { key: string; label: string; tone: BucketTone; match: ExpiryStatus[]; urgent: boolean }[] = [
  { key: "now", label: "Use now", tone: "critical", match: ["EXPIRED", "CRITICAL"], urgent: true },
  { key: "week", label: "This week", tone: "soon", match: ["SOON"], urgent: false },
  { key: "fresh", label: "Fresh", tone: "fresh", match: ["FRESH"], urgent: false },
  { key: "nodate", label: "No date", tone: "unknown", match: ["UNKNOWN"], urgent: false },
];

const DOT: Record<BucketTone, string> = {
  critical: "bg-status-critical",
  soon: "bg-status-soon",
  fresh: "bg-status-fresh",
  unknown: "bg-status-unknown",
};

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

  const sort = (sp.sort as "expiry" | "name" | "recent") ?? "expiry";
  const [items, { absoluteDates }] = await Promise.all([
    listInventory(user!.id, { q: sp.q, filter: sp.filter, sort }),
    getPreferences(user!.id).then(accessibilityPrefs),
  ]);

  const hasQuery = Boolean(sp.q || (sp.filter && sp.filter !== "all"));
  const grouped = sort === "expiry";

  const status = (i: (typeof items)[number]) => classifyStatus(i.expiryDate, i.expirySource as ExpirySource);

  // Chip counts only when the whole live set is loaded (no search, no filter) —
  // otherwise an inactive chip's number would describe a filtered subset.
  const fullSet = !sp.q && (!sp.filter || sp.filter === "all");
  const counts = fullSet
    ? {
        all: items.length,
        soon: items.filter((i) => ["SOON", "CRITICAL"].includes(status(i))).length,
        expired: items.filter((i) => status(i) === "EXPIRED").length,
        fridge: items.filter((i) => i.storageLocation === "REFRIGERATOR").length,
        freezer: items.filter((i) => i.storageLocation === "FREEZER").length,
        pantry: items.filter((i) => i.storageLocation === "PANTRY").length,
        cupboard: items.filter((i) => i.storageLocation === "CUPBOARD").length,
      }
    : undefined;

  const needUsing = counts ? counts.soon + counts.expired : 0;
  const subtitle =
    items.length > 0
      ? `${items.length} item${items.length === 1 ? "" : "s"} in stock` +
        (needUsing > 0 ? ` · ${needUsing} need${needUsing === 1 ? "s" : ""} using` : "")
      : undefined;

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle={subtitle}
        actions={
          <Button asChild size="sm">
            <Link href="/inventory/new">
              <Icon name="plus" size={16} />
              Add
            </Link>
          </Button>
        }
      />

      <InventoryControls counts={counts} />

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
      ) : grouped ? (
        <div className="flex flex-col gap-6">
          {BUCKETS.map((b) => {
            const inBucket = items.filter((i) => b.match.includes(status(i)));
            if (inBucket.length === 0) return null;
            return (
              <section key={b.key}>
                <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center gap-2 bg-surface/95 px-4 py-1.5 backdrop-blur-sm lg:-mx-1 lg:px-1">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[b.tone])} aria-hidden />
                  <h2 className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted">
                    {b.label} · {inBucket.length}
                  </h2>
                </div>
                <ul className="flex flex-col gap-3">
                  {inBucket.map((item) =>
                    b.urgent ? (
                      <ItemCard key={item.id} item={item} absoluteDates={absoluteDates} />
                    ) : (
                      <ItemRow key={item.id} item={item} absoluteDates={absoluteDates} />
                    ),
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} absoluteDates={absoluteDates} />
          ))}
        </ul>
      )}

      <PrimaryAction href="/inventory/new" label="Add" icon="plus" />
    </main>
  );
}
