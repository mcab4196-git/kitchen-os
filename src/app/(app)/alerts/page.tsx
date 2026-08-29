import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getExpiryAlerts, type AlertItem } from "@/server/services/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";

function label(days: number): { text: string; cls: string } {
  if (days < 0) return { text: `expired ${Math.abs(days)}d ago`, cls: "text-status-critical-fg" };
  if (days === 0) return { text: "expires today", cls: "text-status-critical-fg" };
  if (days === 1) return { text: "expires tomorrow", cls: "text-status-soon-fg" };
  return { text: `in ${days} days`, cls: "text-status-soon-fg" };
}

function Group({ title, items }: { title: string; items: AlertItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-2xs font-semibold uppercase tracking-[0.12em] text-faint">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((it) => {
          const l = label(it.daysLeft);
          return (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 rounded-control border border-line bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">{it.productName}</p>
                <p className="text-2xs text-muted tabular">
                  {it.quantity} {it.unit} · <span className={l.cls}>{l.text}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[13px]">
                <Link
                  href={`/inventory/${it.id}/use`}
                  className="inline-flex h-8 items-center gap-1 rounded-control px-2.5 font-medium text-brand transition-colors hover:bg-brand-soft active:scale-95"
                >
                  <Icon name="minus" size={14} />
                  Use
                </Link>
                <Link
                  href={`/inventory/${it.id}/edit`}
                  className="inline-flex h-8 items-center rounded-control px-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink active:scale-95"
                >
                  Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const alerts = await getExpiryAlerts(user!.id);

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Expiring soon"
        subtitle={alerts.count > 0 ? alerts.summary : undefined}
        back="/dashboard"
        size="md"
      />

      {alerts.count === 0 ? (
        <EmptyState
          icon="leaf"
          title="Nothing expiring"
          description={`Nothing within ${alerts.thresholdDays} day${alerts.thresholdDays === 1 ? "" : "s"}. Your kitchen is in good shape.`}
        />
      ) : (
        <>
          <Group title="Expired" items={alerts.expired} />
          <Group title="Today" items={alerts.today} />
          <Group title="Soon" items={alerts.soon} />
        </>
      )}
    </main>
  );
}
