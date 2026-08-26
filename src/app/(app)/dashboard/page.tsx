import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { ExpiryBadge } from "@/components/inventory/expiry-badge";
import { ExpiryReminder } from "@/components/expiry-reminder";
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
    <main>
      <header className="mb-6">
        <p className="text-sm text-muted">{greeting()}</p>
        <h1 className="font-display text-2xl text-ink">Your kitchen</h1>
      </header>

      {isEmpty ? (
        <p className="mb-5 text-[15px] text-ink">
          Nothing in your inventory yet — add your first items to get started.
        </p>
      ) : alerts.count > 0 ? (
        <Link
          href="/alerts"
          className="mb-5 flex items-center justify-between rounded-2xl border border-status-soon/30 bg-status-soon/10 p-4"
        >
          <div>
            <p className="text-[15px] font-medium text-ink">
              {alerts.count} item{alerts.count > 1 ? "s" : ""} to use up
            </p>
            <p className="mt-0.5 text-sm text-muted">{alerts.summary}</p>
            <ExpiryReminder count={alerts.count} summary={alerts.summary} />
          </div>
          <span className="text-muted">›</span>
        </Link>
      ) : (
        <p className="mb-5 text-[15px] text-ink">Nothing expiring soon. Your kitchen is in good shape.</p>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Stat label="In stock" value={total} tone="ink" />
        <Stat label="Use soon" value={expiringSoon} tone="soon" />
        <Stat label="Expired" value={expired} tone="critical" />
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/scan" className="contents">
          <Button variant="accent" className="h-14 w-full">
            Scan receipt
          </Button>
        </Link>
        <Link href="/inventory/new" className="contents">
          <Button variant="primary" className="h-14 w-full">
            Add item
          </Button>
        </Link>
      </div>

      {useSoonItems.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Use soon</h2>
            <Link href="/inventory" className="text-sm text-brand">
              All inventory
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {useSoonItems.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3"
              >
                <span className="min-w-0 truncate text-sm text-ink">
                  {it.productName}{" "}
                  <span className="text-muted">
                    · {it.quantity} {it.unit}
                  </span>
                </span>
                <ExpiryBadge expiryDate={it.expiryDate} source={it.expirySource as ExpirySource} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {isEmpty && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-brand-soft/40 p-6 text-center">
          <p className="font-display text-lg text-brand-ink">Let&apos;s fill the shelves</p>
          <p className="mt-1 text-sm text-muted">
            Add items to see expiry tracking. Receipt scanning lands in M2.
          </p>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ink" | "soon" | "critical" }) {
  const color =
    tone === "soon" ? "text-status-soon" : tone === "critical" ? "text-status-critical" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
