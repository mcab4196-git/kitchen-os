import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getExpiryAlerts, type AlertItem } from "@/server/services/notifications";

function label(days: number): { text: string; cls: string } {
  if (days < 0) return { text: `expired ${Math.abs(days)}d ago`, cls: "text-status-critical" };
  if (days === 0) return { text: "expires today", cls: "text-status-critical" };
  if (days === 1) return { text: "expires tomorrow", cls: "text-status-soon" };
  return { text: `in ${days} days`, cls: "text-status-soon" };
}

function Group({ title, items }: { title: string; items: AlertItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-lg text-ink">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((it) => {
          const l = label(it.daysLeft);
          return (
            <li key={it.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{it.productName}</p>
                <p className="text-xs text-muted">
                  {it.quantity} {it.unit} · <span className={l.cls}>{l.text}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <Link href={`/inventory/${it.id}/use`} className="text-brand">
                  Use
                </Link>
                <Link href={`/inventory/${it.id}/edit`} className="text-muted">
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
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
          ← Home
        </Link>
        <h1 className="font-display text-2xl text-ink">Expiring</h1>
      </header>

      {alerts.count === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          Nothing expiring within {alerts.thresholdDays} day{alerts.thresholdDays === 1 ? "" : "s"}. Your kitchen is in
          good shape.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">{alerts.summary}</p>
          <Group title="Expired" items={alerts.expired} />
          <Group title="Today" items={alerts.today} />
          <Group title="Soon" items={alerts.soon} />
        </>
      )}
    </main>
  );
}
