import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { tidy } from "@/lib/units";
import { classifyStatus, type ExpirySource } from "@/lib/expiry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/components/ui/feedback";
import { FreshnessBar } from "@/components/inventory/freshness-bar";
import { STORAGE_LABEL } from "@/components/inventory/item-card";
import { getCookSummary, nextToUse } from "@/server/services/inventory";
import { getPreferences, accessibilityPrefs } from "@/server/services/preferences";
import { addRanOutAction } from "./actions";

/** "Pork belly, Tokwa and Garlic". */
function listNames(names: string[]) {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "";
}

/**
 * Dinner done [5.8]: where Cook & deduct lands. It sums up what this cook changed
 * (from the consumption records it wrote, passed as `?r=`), what ran out, and what
 * to use next.
 */
export default async function DinnerDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [summary, next, prefs] = await Promise.all([
    getCookSummary(user.id, id, (sp.r ?? "").split(",")),
    nextToUse(user.id),
    getPreferences(user.id),
  ]);
  // A stale, edited or someone else's link: nothing of this user's to sum up.
  if (!summary) redirect("/dashboard");
  const { absoluteDates } = accessibilityPrefs(prefs);

  const rows = summary.records.map((rec) => {
    const item = rec.inventoryItem;
    const usedUp = item.quantity <= 0;
    // Status when it was cooked. A used-up item keeps its date, so this is exact; a
    // partly used one may have been re-estimated on opening, so it never counts.
    const was = classifyStatus(item.expiryDate, item.expirySource as ExpirySource, rec.createdAt);
    return {
      id: rec.id,
      itemId: item.id,
      name: item.productName,
      usedUp,
      inTime: usedUp && (was === "CRITICAL" || was === "SOON"),
      used: `${tidy(rec.quantityUsed)} ${rec.unit}`,
      left: `${tidy(item.quantity)} ${item.unit}`,
    };
  });
  const inTime = rows.filter((r) => r.inTime).length;
  const ranOut = rows.filter((r) => r.usedUp);

  return (
    <main className="animate-fade-in">
      <Link
        href="/dashboard"
        className="-ml-2 inline-flex h-11 items-center gap-1 rounded-control px-2 text-sm text-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon name="arrow-left" size={18} />
        Today
      </Link>

      <header className="mt-2 flex flex-col items-center text-center">
        <span
          aria-hidden
          className="flex h-20 w-20 animate-pop-in items-center justify-center rounded-full border-4 border-double border-brand bg-brand-soft text-brand"
        >
          <Icon name="check" size={36} strokeWidth={2.2} />
        </span>
        <h1 className="mt-4 font-display text-title text-ink">Dinner done</h1>
        <p className="mt-1 max-w-[36ch] text-body leading-6 text-muted">
          {summary.recipeName} is cooked. Your stock is updated.
        </p>
      </header>

      {inTime > 0 && (
        <p className="mt-6 flex items-center gap-2.5 rounded-card border border-status-fresh-border bg-status-fresh-bg px-4 py-3 text-body font-semibold text-status-fresh-fg">
          <Icon name="leaf" size={19} className="shrink-0" />
          {inTime === 1 ? "1 item" : `${inTime} items`} used up before {inTime === 1 ? "it" : "they"} expired
        </p>
      )}

      <section className="mt-4 rounded-card border-[3px] border-double border-line-strong bg-card px-4 pb-1.5 pt-3 shadow-card">
        <h2 className="font-display text-title-sm text-ink">Stock changes</h2>
        <ul className="mt-1">
          {rows.map((r) => (
            <li key={r.id} className="flex min-h-12 items-center gap-2.5 border-t border-line/70 py-1.5 text-sm">
              <span className={cn("min-w-0 flex-1 text-ink", r.usedUp && "font-medium")}>{r.name}</span>
              {r.inTime ? <Badge tone="fresh">Used in time</Badge> : r.usedUp ? <Badge tone="neutral">Used up</Badge> : null}
              <span className="w-32 shrink-0 text-right tabular">
                <span className="block text-ink">{r.usedUp ? "None left" : `${r.left} left`}</span>
                <span className="block text-2xs text-muted">used {r.used}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {ranOut.length > 0 && (
        <form action={addRanOutAction} className="mt-5">
          <input type="hidden" name="itemIds" value={ranOut.map((r) => r.itemId).join(",")} />
          <p className="mb-2 text-sm text-muted">{listNames(ranOut.map((r) => r.name))} ran out.</p>
          <SubmitButton size="lg" className="w-full" pendingText="Adding…">
            <Icon name="cart" size={18} />
            Add {ranOut.length} to shopping list
          </SubmitButton>
        </form>
      )}

      {next && (
        <Link
          href={`/inventory/${next.id}/use`}
          className="mt-5 flex min-h-16 items-center gap-3 rounded-card border border-line bg-card px-3.5 py-2.5 shadow-card transition duration-fast ease-out hover:border-line-strong hover:shadow-pop active:translate-y-px"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-ink">Up next: the {next.productName}</span>
            <span className="mt-0.5 block text-small text-muted tabular">
              {tidy(next.quantity)} {next.unit} · {STORAGE_LABEL[next.storageLocation] ?? next.storageLocation}
            </span>
          </span>
          <FreshnessBar
            expiryDate={next.expiryDate}
            source={next.expirySource as ExpirySource}
            since={next.purchaseDate ?? next.createdAt}
            absoluteDates={absoluteDates}
            className="shrink-0"
          />
        </Link>
      )}

      <Button asChild variant="secondary" size="lg" className="mt-3 w-full">
        <Link href="/dashboard">Back to Today</Link>
      </Button>
    </main>
  );
}
