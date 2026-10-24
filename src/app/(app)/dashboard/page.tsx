import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { tidy } from "@/lib/units";
import { type ExpirySource } from "@/lib/expiry";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PrimaryAction } from "@/components/ui/primary-action";
import { ExpiryReminder } from "@/components/expiry-reminder";
import { TodayDate } from "@/components/today-date";
import { FreshnessBar } from "@/components/inventory/freshness-bar";
import { STORAGE_LABEL } from "@/components/inventory/item-card";
import { getExpiryAlerts } from "@/server/services/notifications";
import { getPreferences, accessibilityPrefs } from "@/server/services/preferences";
import { getToday, type TodayItem } from "@/server/services/today";

// "Also to do" stays short; the full picture is one tap away in Inventory.
const MAX_TASKS = 5;

type Task = { key: string; href: string; title: string; detail: string; item: TodayItem | null };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function itemDetail(i: TodayItem) {
  return [`${tidy(i.quantity)} ${i.unit}`, STORAGE_LABEL[i.storageLocation] ?? i.storageLocation, i.opened ? "opened" : null]
    .filter(Boolean)
    .join(" · ");
}

function namesOf(items: TodayItem[]) {
  const names = items.slice(0, 3).map((i) => i.productName).join(", ");
  return items.length > 3 ? `${names} and ${items.length - 3} more` : names;
}

/** One expiring item inside the Tonight card: what it is, and how much life it has left. */
function FreshRow({ item, absoluteDates }: { item: TodayItem; absoluteDates: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="min-w-0 text-[14.5px] font-medium text-ink">
        {item.productName} <span className="font-normal text-muted tabular">· {itemDetail(item)}</span>
      </span>
      <FreshnessBar
        expiryDate={item.expiryDate}
        source={item.expirySource as ExpirySource}
        since={item.purchaseDate ?? item.createdAt}
        absoluteDates={absoluteDates}
        className="shrink-0"
      />
    </div>
  );
}

// The one double-ruled card on the screen (DESIGN.md, "The Double-Rule Rule").
const TONIGHT_CARD = "rounded-card border-[3px] border-double border-line-strong bg-card p-4 shadow-card";

/**
 * Today [5.8]: the home screen chosen in PLAN 5.5. A "Tonight" card puts the most
 * urgent stock into a dinner; "Also to do" lists the rest: items to use this week,
 * expired items to check, and items without a date.
 * On desktop the two sit side by side; on a phone, Tonight comes first.
 */
export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The layout redirects too, but it renders in parallel with this page, so the page can't assume a user.
  if (!user) redirect("/login");
  const userId = user.id;

  const [today, alerts, prefs] = await Promise.all([
    getToday(userId),
    getExpiryAlerts(userId),
    getPreferences(userId),
  ]);
  const { absoluteDates } = accessibilityPrefs(prefs);

  // Empty variant [1c]: lead straight with the two ways in, Scan first, stacked
  // full-width. No zeroed counts, no floating action — nothing to act on yet.
  if (today.total === 0) {
    return (
      <main className="animate-fade-in">
        <PageHeader title="Today" />
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

  const { tonight } = today;
  // With no dinner idea that uses it, the most urgent item gets the card on its own.
  const focus = tonight ? null : (today.expiring[0] ?? null);
  const onCard = new Set([...(tonight?.uses ?? []), ...(focus ? [focus] : [])].map((i) => i.id));

  const tasks: Task[] = [
    ...today.expiring
      .filter((i) => !onCard.has(i.id))
      .map((i) => ({ key: i.id, href: `/inventory/${i.id}/use`, title: `Use the ${i.productName}`, detail: itemDetail(i), item: i })),
    ...today.expired.map((i) => ({
      key: i.id,
      href: `/inventory/${i.id}/use`,
      title: `Check the ${i.productName}`,
      detail: itemDetail(i),
      item: i,
    })),
  ];
  if (today.noDate.length > 0) {
    tasks.push({
      key: "no-date",
      href: "/inventory",
      title: `Add dates to ${plural(today.noDate.length, "item")}`,
      detail: namesOf(today.noDate),
      item: null,
    });
  }
  const shown = tasks.slice(0, MAX_TASKS);
  const todo = (tonight || focus ? 1 : 0) + tasks.length;
  const allGood = today.expiring.length === 0 && today.expired.length === 0;

  let card: ReactNode = null;
  if (tonight) {
    const r = tonight.recipe;
    const minutes = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
    card = (
      <article className={TONIGHT_CARD}>
        <h2 className="font-display text-title-sm text-ink text-balance">Use the {tonight.uses[0].productName} tonight</h2>
        <p className="mt-2 text-[15px] leading-6 text-ink">
          Cook{" "}
          <Link
            href={`/meals/${r.id}`}
            className="font-semibold text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:decoration-brand"
          >
            {r.name}
          </Link>{" "}
          ({minutes > 0 ? `${minutes} min, ` : ""}serves {r.servings}). It uses {plural(tonight.uses.length, "item")} that
          need{tonight.uses.length === 1 ? "s" : ""} using.
        </p>
        <div className="mt-3 border-t border-line pt-1">
          {tonight.uses.slice(0, 3).map((i) => (
            <FreshRow key={i.id} item={i} absoluteDates={absoluteDates} />
          ))}
        </div>
        {(tonight.short.length > 0 || tonight.missing.length > 0) && (
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {tonight.short.map((l) => (
              <li key={l.name} className="flex items-center gap-2 text-status-soon-fg">
                <Icon name="alert" size={16} className="shrink-0" />
                {l.name}: not enough
                {l.have != null && l.needed != null && ` (${tidy(l.have)} of ${tidy(l.needed)}${l.unit ? ` ${l.unit}` : ""})`}
              </li>
            ))}
            {tonight.missing.length > 0 && (
              <li className="flex items-center gap-2 text-accent-fg">
                <Icon name="cart" size={16} className="shrink-0" />
                Missing: {tonight.missing.map((l) => l.name).join(", ")}
              </li>
            )}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <Button asChild size="lg" className="flex-1">
            <Link href={`/meals/${r.id}/cook`}>
              <Icon name="cook" size={18} />
              Cook &amp; deduct
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/meals">Other ideas</Link>
          </Button>
        </div>
      </article>
    );
  } else if (focus) {
    card = (
      <article className={TONIGHT_CARD}>
        <h2 className="font-display text-title-sm text-ink text-balance">Plan dinner around the {focus.productName}</h2>
        <p className="mt-2 text-[15px] leading-6 text-ink">
          None of your saved or suggested dinners uses it yet. Get ideas that use what&apos;s expiring first.
        </p>
        <div className="mt-3 border-t border-line pt-1">
          <FreshRow item={focus} absoluteDates={absoluteDates} />
        </div>
        <Button asChild size="lg" className="mt-4 w-full">
          <Link href="/meals">
            <Icon name="sparkles" size={18} />
            What&apos;s for dinner?
          </Link>
        </Button>
      </article>
    );
  } else if (allGood) {
    card = (
      <div className="flex items-center gap-2.5 rounded-card border border-status-fresh-border bg-status-fresh-bg p-4 text-[14px] text-status-fresh-fg">
        <Icon name="leaf" size={17} className="shrink-0" />
        Nothing expiring soon. Your kitchen is in good shape.
      </div>
    );
  }

  return (
    <main
      data-wide={card ? true : undefined}
      className={cn(
        "animate-fade-in",
        card && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8",
      )}
    >
      <div className="lg:col-start-1">
        <PageHeader
          title="Today"
          subtitle={<TodayDate suffix={todo === 0 ? "nothing urgent" : `${plural(todo, "thing")} to do`} />}
          actions={
            <Button asChild size="sm" className="lg:hidden">
              <Link href="/scan">
                <Icon name="scan" size={16} />
                Scan
              </Link>
            </Button>
          }
          className="mb-3"
        />
        <p className="flex flex-wrap gap-x-4 text-[13.5px] leading-5 text-muted">
          <Link href="/inventory" className="inline-flex min-h-11 items-center gap-1 text-ink transition-colors hover:text-brand">
            <strong className="font-semibold tabular">{today.total}</strong> in stock
          </Link>
          {today.expiring.length > 0 && (
            <Link
              href="/inventory?filter=soon"
              className="inline-flex min-h-11 items-center gap-1 text-status-soon-fg transition-colors hover:text-ink"
            >
              <strong className="font-semibold tabular">{today.expiring.length}</strong> use soon
            </Link>
          )}
          {today.expired.length > 0 && (
            <Link
              href="/inventory?filter=expired"
              className="inline-flex min-h-11 items-center gap-1 text-status-critical-fg transition-colors hover:text-ink"
            >
              <strong className="font-semibold tabular">{today.expired.length}</strong> expired
            </Link>
          )}
        </p>
        {alerts.count > 0 && <ExpiryReminder count={alerts.count} summary={alerts.summary} />}
      </div>

      {card && <div className="mt-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start">{card}</div>}

      {shown.length > 0 && (
        <section className="mt-8 lg:col-start-1 lg:row-start-2 lg:mt-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="font-display text-title-sm text-ink">Also to do</h2>
            <Link href="/inventory" className="text-[13px] font-medium text-brand transition-colors hover:text-brand-ink">
              All inventory
            </Link>
          </div>
          <ul className="overflow-hidden rounded-card border border-line bg-card shadow-card">
            {shown.map((t, i) => (
              <li key={t.key} className={cn(i > 0 && "border-t border-line")}>
                <Link
                  href={t.href}
                  className="flex min-h-[3.75rem] items-center gap-3 px-3.5 py-2.5 transition-colors duration-fast hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-ink">{t.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted tabular">{t.detail}</span>
                  </span>
                  <FreshnessBar
                    expiryDate={t.item?.expiryDate ?? null}
                    source={(t.item?.expirySource ?? "UNKNOWN") as ExpirySource}
                    since={t.item ? (t.item.purchaseDate ?? t.item.createdAt) : new Date()}
                    absoluteDates={absoluteDates}
                    className="shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {tasks.length > shown.length && (
            <p className="mt-2 text-[13px] text-muted">
              {tasks.length - shown.length} more in{" "}
              <Link href="/inventory" className="font-medium text-brand hover:text-brand-ink">
                Inventory
              </Link>
            </p>
          )}
        </section>
      )}

      <PrimaryAction href="/inventory/new" label="Add" icon="plus" />
    </main>
  );
}
