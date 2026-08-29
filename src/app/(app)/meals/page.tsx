import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCurrentSuggestions, listSaved } from "@/server/services/recipe";
import { DinnerButton } from "./dinner-button";
import { SaveToggle } from "@/components/recipe/save-toggle";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";

const DIFF_LABEL: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

type RecipeCardData = {
  id: string;
  name: string;
  description: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  difficulty: string;
  servings: number;
  saved: boolean;
};

function RecipeCard({ r }: { r: RecipeCardData }) {
  const time = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
  return (
    <Card as="li" interactive className="group list-none">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/meals/${r.id}`} className="min-w-0 flex-1 focus-visible:outline-none">
          <p className="flex items-center gap-1 text-[15px] font-semibold text-ink">
            <span className="min-w-0 truncate">{r.name}</span>
            <Icon
              name="chevron-right"
              size={15}
              className="shrink-0 -translate-x-1 text-faint opacity-0 transition-all duration-fast ease-out group-hover:translate-x-0 group-hover:opacity-100"
            />
          </p>
          {r.description && <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted">{r.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-2xs text-muted tabular">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={13} />
              {time > 0 ? `${time} min` : "quick"}
            </span>
            <span>{DIFF_LABEL[r.difficulty] ?? r.difficulty}</span>
            <span>serves {r.servings}</span>
          </div>
        </Link>
        <SaveToggle recipeId={r.id} saved={r.saved} />
      </div>
    </Card>
  );
}

export default async function MealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const suggestions = await listCurrentSuggestions(user!.id);
  const saved = await listSaved(user!.id, suggestions.map((s) => s.id));

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Cook"
        subtitle="Your saved recipes come first — the AI only fills the gaps."
        actions={
          <Link
            href="/plan"
            className="inline-flex h-9 items-center gap-1 rounded-control border border-line bg-card px-3 text-[13px] font-medium text-ink transition-colors duration-fast hover:bg-surface-2"
          >
            <Icon name="calendar" size={15} />
            Plan week
          </Link>
        }
      />

      <DinnerButton />

      {suggestions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-title-sm text-ink">Tonight&apos;s ideas</h2>
          <ul className="flex flex-col gap-3">
            {suggestions.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {saved.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-title-sm text-ink">Saved recipes</h2>
          <ul className="flex flex-col gap-3">
            {saved.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {suggestions.length === 0 && saved.length === 0 && (
        <EmptyState
          className="mt-8"
          icon="cook"
          title="No recipes yet"
          description="Tap “What's for dinner?” for ideas built from what you have. Save the ones you like and they'll come back first next time."
        />
      )}
    </main>
  );
}
