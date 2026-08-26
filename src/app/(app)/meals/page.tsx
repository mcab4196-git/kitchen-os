import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCurrentSuggestions, listSaved } from "@/server/services/recipe";
import { DinnerButton } from "./dinner-button";
import { SaveToggle } from "@/components/recipe/save-toggle";

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
    <li className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/meals/${r.id}`} className="min-w-0 flex-1">
          <p className="font-medium text-ink">{r.name}</p>
          {r.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>}
          <p className="mt-2 text-xs text-muted">
            {time > 0 ? `${time} min` : "quick"} · {DIFF_LABEL[r.difficulty] ?? r.difficulty} · serves {r.servings}
          </p>
        </Link>
        <SaveToggle recipeId={r.id} saved={r.saved} />
      </div>
    </li>
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
    <main>
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Meals</h1>
          <p className="mt-1 text-sm text-muted">
            Your saved recipes come first; we ask the AI only to fill the rest.
          </p>
        </div>
        <Link href="/plan" className="mt-1 whitespace-nowrap text-sm text-brand">
          Plan week →
        </Link>
      </header>

      <DinnerButton />

      {suggestions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg text-ink">Tonight&apos;s ideas</h2>
          <ul className="flex flex-col gap-3">
            {suggestions.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {saved.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg text-ink">Saved recipes</h2>
          <ul className="flex flex-col gap-3">
            {saved.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
