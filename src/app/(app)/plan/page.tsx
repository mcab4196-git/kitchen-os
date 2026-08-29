import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLatestPlan } from "@/server/services/recipe";
import { PlanControls } from "./plan-controls";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";

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
        <section className="mt-8">
          <h2 className="mb-3 font-display text-title-sm text-ink">
            Your plan{" "}
            <span className="text-[13px] font-normal text-muted tabular">
              from {new Date(data.plan.startDate).toLocaleDateString()}
            </span>
          </h2>
          <ol className="flex flex-col gap-3">
            {data.items.map((it, i) => {
              const d = new Date(it.date);
              return (
                <li key={it.id} className="flex items-stretch gap-3">
                  <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-control border border-line bg-card py-2">
                    <span className="text-2xs text-muted">{WEEKDAY[d.getDay()]}</span>
                    <span className="font-display text-title-sm text-ink tabular">{d.getDate()}</span>
                  </div>
                  {it.recipe ? (
                    <Link
                      href={`/meals/${it.recipe.id}`}
                      className="group flex flex-1 items-center justify-between gap-3 rounded-card border border-line bg-card p-3.5 shadow-card transition duration-fast ease-out hover:border-line-strong hover:shadow-pop active:translate-y-px"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">{it.recipe.name}</p>
                        <p className="mt-0.5 text-2xs text-muted tabular">
                          Day {i + 1} · {(it.recipe.prepMinutes ?? 0) + (it.recipe.cookMinutes ?? 0)} min
                        </p>
                      </div>
                      <Icon
                        name="chevron-right"
                        size={17}
                        className="shrink-0 text-faint transition-transform duration-fast group-hover:translate-x-0.5"
                      />
                    </Link>
                  ) : (
                    <div className="flex-1 rounded-card border border-dashed border-line p-3.5 text-[13px] text-muted">
                      No meal
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {data.items.length < data.plan.days && (
            <p className="mt-3 text-[13px] text-muted">
              Planned {data.items.length} of {data.plan.days} days — add more ingredients (or scan a receipt) for a
              fuller week.
            </p>
          )}
        </section>
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
