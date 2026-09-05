import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ExpiryBadge } from "@/components/inventory/expiry-badge";
import { statusRailClass } from "@/components/inventory/status-rail";
import { ExpiryReminder } from "@/components/expiry-reminder";
import { EmptyState } from "@/components/ui/empty-state";
import { PrimaryAction } from "@/components/ui/primary-action";
import { getExpiryAlerts } from "@/server/services/notifications";
import { getPreferences, accessibilityPrefs } from "@/server/services/preferences";
import { classifyStatus, type ExpirySource } from "@/lib/expiry";

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
  const { absoluteDates } = accessibilityPrefs(await getPreferences(userId));
  const isEmpty = total === 0;

  const Greeting = (
    <header className="mb-6">
      <p className="text-2xs font-medium uppercase tracking-[0.14em] text-faint">{greeting()}</p>
      <h1 className="mt-1 font-display text-title text-ink">Your kitchen</h1>
    </header>
  );

  // Empty variant [1c]: lead straight with the two ways in, Scan first, stacked
  // full-width. No zeroed counts, no floating action — nothing to act on yet.
  if (isEmpty) {
    return (
      <main className="animate-fade-in">
        {Greeting}
        <EmptyState
          icon="leaf"
          title="Let's fill the shelves"
          description="Scan the receipt from your last shop to add several items at once, or add one by hand."
          action={
            <div className="flex w-full flex-col gap-2.5">
              <Button asChild size="lg">
                <Link href="/scan">
                  <Icon name="scan" size={18} />
                  Scan a receipt
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/inventory/new">
                  <Icon name="plus" size={18} />
                  Add an item by hand
                </Link>
              </Button>
            </div>
          }
        />
      </main>
    );
  }

  return (
    <main className="animate-fade-in">
      {Greeting}

      {alerts.count > 0 ? (
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
        <Button asChild size="lg" className="min-h-14">
          <Link href="/scan">
            <Icon name="scan" size={18} />
            Scan receipt
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="min-h-14">
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
            {useSoonItems.map((it) => {
              const status = classifyStatus(it.expiryDate, it.expirySource as ExpirySource);
              return (
                <li key={it.id}>
                  <Link
                    href={`/inventory/${it.id}/use`}
                    className={cn(
                      "group flex min-h-[3.5rem] items-center justify-between gap-3 rounded-control border border-line bg-card p-3 transition duration-fast ease-out hover:border-line-strong hover:shadow-card active:translate-y-px",
                      statusRailClass(status),
                    )}
                  >
                    <span className="min-w-0 flex-1 text-[14px] text-ink">
                      {it.productName}{" "}
                      <span className="text-muted tabular">
                        · {it.quantity} {it.unit}
                      </span>
                    </span>
                    <ExpiryBadge
                      expiryDate={it.expiryDate}
                      source={it.expirySource as ExpirySource}
                      absoluteDates={absoluteDates}
                      pulse
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/meals"
            className="mt-3 flex min-h-12 items-center gap-2.5 rounded-card border border-brand-soft bg-brand-soft px-3.5 py-3 text-[13px] font-medium text-brand-ink transition duration-fast ease-out hover:bg-brand-soft/70"
          >
            <Icon name="sparkles" size={18} className="shrink-0" />
            <span className="flex-1">Cook these three tonight</span>
            <Icon name="chevron-right" size={17} className="shrink-0" />
          </Link>
        </section>
      )}

      <PrimaryAction href="/inventory/new" label="Add" icon="plus" />
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
  const t = {
    ink: { border: "border-line", text: "text-ink" },
    soon: { border: "border-status-soon-border", text: "text-status-soon-fg" },
    critical: { border: "border-status-critical-border", text: "text-status-critical-fg" },
  }[tone];
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-card border bg-card p-3.5 shadow-xs transition duration-fast ease-out hover:shadow-card active:translate-y-px",
        t.border,
      )}
    >
      <div className={cn("font-display text-title tabular", t.text)}>{value}</div>
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
