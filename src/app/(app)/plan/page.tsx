import { createClient } from "@/lib/supabase/server";
import { getLatestPlan } from "@/server/services/recipe";
import { PlanControls } from "./plan-controls";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkRow } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const data = await getLatestPlan(user!.id);

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Meal plan"
        subtitle="A dinner plan from your inventory — expiring items first, no ingredient twice."
        back="/meals"
        size="md"
      />

      <PlanControls />

      {data && data.items.length > 0 ? (
        (() => {
          const start = new Date(data.plan.startDate);
          const rows = Array.from({ length: data.plan.days }, (_, i) => {
            const item = data.items[i] ?? null;
            const date = item
              ? new Date(item.date)
              : new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            return { i, date, item };
          });
          return (
            <section className="mt-8">
              <h2 className="mb-3 font-display text-title-sm text-ink">
                Your plan{" "}
                <span className="text-small font-normal text-muted tabular">
                  from {start.toLocaleDateString()}
                </span>
              </h2>
              <ol className="flex flex-col gap-3">
                {rows.map(({ i, date, item }) => (
                  <li key={i} className="flex items-stretch gap-3">
                    <div
                      className={cn(
                        "flex w-12 shrink-0 flex-col items-center justify-center rounded-control border py-2",
                        item ? "border-line bg-card" : "border-dashed border-line-strong",
                      )}
                    >
                      <span className="text-2xs text-muted">{WEEKDAY[date.getDay()]}</span>
                      <span
                        className={cn(
                          "font-display text-title-sm tabular",
                          item ? "text-ink" : "text-muted",
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                    {item?.recipe ? (
                      <LinkRow href={`/meals/${item.recipe.id}`} className="flex-1">
                        <p className="truncate text-compact font-semibold text-ink">{item.recipe.name}</p>
                        <p className="mt-0.5 text-2xs text-muted tabular">
                          Day {i + 1} · {(item.recipe.prepMinutes ?? 0) + (item.recipe.cookMinutes ?? 0)} min
                        </p>
                      </LinkRow>
                    ) : (
                      <div className="flex flex-1 items-center rounded-card border border-dashed border-line-strong p-3.5 text-small leading-5 text-muted">
                        Not enough left to plan — add ingredients or scan a receipt.
                      </div>
                    )}
                  </li>
                ))}
              </ol>
              {data.items.length < data.plan.days && (
                <p className="mt-3 text-small leading-5 text-muted">
                  Planned {data.items.length} of {data.plan.days} days — add more ingredients (or scan a
                  receipt) for a fuller week.
                </p>
              )}
            </section>
          );
        })()
      ) : (
        <EmptyState
          className="mt-8"
          icon="calendar"
          title="No plan yet"
          description="Pick a length above and we'll build a dinner plan from what's in your kitchen."
        />
      )}
    </main>
  );
}
