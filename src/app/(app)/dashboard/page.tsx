import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ExpiryBadge } from "@/components/inventory/expiry-badge";
import { ExpiryReminder } from "@/components/expiry-reminder";
import { EmptyState } from "@/components/ui/empty-state";
import { getExpiryAlerts } from "@/server/services/notifications";
import type { ExpirySource } from "@/lib/expiry";

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [total, expiringSoon, expired, useSoonItems] = await Promise.all([
    prisma.inventoryItem.count({ where: { userId, isDeleted: false, quantity: { gt: 0 } } }),
    prisma.inventoryItem.count({
      where: { userId, isDeleted: false, quantity: { gt: 0 }, expiryDate: { gte: now, lte: soon } },
    }),
    prisma.inventoryItem.count({ where: { userId, isDeleted: false, quantity: { gt: 0 }, expiryDate: { lt: now } } }),
    prisma.inventoryItem.findMany({
      where: { userId, isDeleted: false, quantity: { gt: 0 }, expiryDate: { lte: soon } },
      orderBy: { expiryDate: "asc" },
      take: 4,
    }),
  ]);

  const alerts = await getExpiryAlerts(userId);
  const isEmpty = total === 0;

  return (
    <main className="animate-fade-in">
      <header className="mb-6">
        <p className="text-2xs font-medium uppercase tracking-[0.14em] text-faint">{greeting()}</p>
        <h1 className="mt-1 font-display text-title text-ink">Your kitchen</h1>
      </header>

      {isEmpty ? (
        <p className="mb-6 text-[15px] leading-6 text-ink">
          Nothing in your inventory yet — add your first items or scan a receipt to get started.
        </p>
      ) : alerts.count > 0 ? (
        <div className="mb-6 rounded-card border border-status-soon-border bg-status-soon-bg p-4">
          <Link href="/alerts" className="group flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-soon/15 text-status-soon-fg">
              <Icon name="alert" size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-status-soon-fg">
                {alerts.count} item{alerts.count > 1 ? "s" : ""} to use up
              </p>
              <p className="mt-0.5 text-[13px] text-status-soon-fg/80">{alerts.summary}</p>
            </div>
            <Icon
              name="chevron-right"
              size={18}
              className="mt-1.5 shrink-0 text-status-soon-fg/60 transition-transform duration-fast group-hover:translate-x-0.5"
            />
          </Link>
          <ExpiryReminder count={alerts.count} summary={alerts.summary} />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-2.5 rounded-card border border-status-fresh-border bg-status-fresh-bg p-4 text-[14px] text-status-fresh-fg">
          <Icon name="leaf" size={17} className="shrink-0" />
          Nothing expiring soon. Your kitchen is in good shape.
        </div>
      )}

      <section className="grid grid-cols-3 gap-2.5">
        <Stat href="/inventory" label="In stock" value={total} tone="ink" />
        <Stat href="/inventory?filter=soon" label="Use soon" value={expiringSoon} tone="soon" />
        <Stat href="/inventory?filter=expired" label="Expired" value={expired} tone="critical" />
      </section>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Button asChild size="lg" className="h-14">
          <Link href="/scan">
            <Icon name="scan" size={18} />
            Scan receipt
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="h-14">
          <Link href="/inventory/new">
            <Icon name="plus" size={18} />
            Add item
          </Link>
        </Button>
      </div>

      {useSoonItems.length > 0 && (
        <section className="mt-9">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-title-sm text-ink">Use soon</h2>
            <Link
              href="/inventory"
              className="text-[13px] font-medium text-brand transition-colors hover:text-brand-ink"
            >
              All inventory
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {useSoonItems.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/inventory/${it.id}/use`}
                  className="group flex items-center justify-between gap-3 rounded-control border border-line bg-card p-3 transition duration-fast ease-out hover:border-line-strong hover:shadow-card active:translate-y-px"
                >
                  <span className="min-w-0 truncate text-[14px] text-ink">
                    {it.productName}{" "}
                    <span className="text-muted tabular">
                      · {it.quantity} {it.unit}
                    </span>
                  </span>
                  <ExpiryBadge
                    expiryDate={it.expiryDate}
                    source={it.expirySource as ExpirySource}
                    pulse
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isEmpty && (
        <EmptyState
          className="mt-8"
          icon="leaf"
          title="Let's fill the shelves"
          description="Add items to track expiry, or scan a grocery receipt to add several at once."
          action={
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/inventory/new">Add an item</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/scan">Scan receipt</Link>
              </Button>
            </div>
          }
        />
      )}
    </main>
  );
}

function Stat({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  tone: "ink" | "soon" | "critical";
}) {
  const color =
    tone === "soon" ? "text-status-soon-fg" : tone === "critical" ? "text-status-critical-fg" : "text-ink";
  return (
    <Link
      href={href}
      className="group rounded-card border border-line bg-card p-3.5 shadow-card transition duration-fast ease-out hover:border-line-strong hover:shadow-pop active:translate-y-px"
    >
      <div className={`font-display text-title tabular ${color}`}>{value}</div>
      <div className="mt-0.5 flex items-center gap-0.5 text-2xs text-muted">
        {label}
        <Icon
          name="chevron-right"
          size={12}
          className="opacity-0 transition-opacity duration-fast group-hover:opacity-100"
        />
      </div>
    </Link>
  );
}
