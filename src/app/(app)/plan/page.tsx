import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLatestPlan } from "@/server/services/recipe";
import { PlanControls } from "./plan-controls";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ planned?: string }> }) {
  const { planned } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const data = await getLatestPlan(user!.id);

  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Meal plan</h1>
        <Link href="/meals" className="text-sm text-brand">
          Recipes
        </Link>
      </header>

      <p className="mb-4 text-sm text-muted">
        A dinner plan built from your inventory — expiring items first, no ingredient planned twice.
      </p>

      <PlanControls />

      {planned && (
        <div className="mt-4 rounded-xl border border-line bg-status-fresh/10 px-4 py-3 text-sm text-status-fresh">
          Planned {planned} day{planned === "1" ? "" : "s"}.
        </div>
      )}

      {data && data.items.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg text-ink">
            Your plan · {new Date(data.plan.startDate).toLocaleDateString()}
          </h2>
          <ol className="flex flex-col gap-3">
            {data.items.map((it, i) => {
              const d = new Date(it.date);
              return (
                <li key={it.id} className="flex items-stretch gap-3">
                  <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-card py-2">
                    <span className="text-xs text-muted">{WEEKDAY[d.getDay()]}</span>
                    <span className="font-display text-lg text-ink">{d.getDate()}</span>
                  </div>
                  {it.recipe ? (
                    <Link
                      href={`/meals/${it.recipe.id}`}
                      className="flex flex-1 items-center justify-between rounded-2xl border border-line bg-card p-4 shadow-card"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{it.recipe.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Day {i + 1} · {(it.recipe.prepMinutes ?? 0) + (it.recipe.cookMinutes ?? 0)} min
                        </p>
                      </div>
                      <span className="text-muted">›</span>
                    </Link>
                  ) : (
                    <div className="flex-1 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
                      No meal
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {data.items.length < data.plan.days && (
            <p className="mt-3 text-sm text-muted">
              Planned {data.items.length} of {data.plan.days} days — add more ingredients (or scan a receipt) for a
              fuller week.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
