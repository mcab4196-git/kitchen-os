import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRecipeWithReconciliation } from "@/server/services/recipe";
import { Button } from "@/components/ui/button";
import { SaveToggle } from "@/components/recipe/save-toggle";
import { addRecipeMissingAction } from "@/app/(app)/shopping/actions";

const DIFF_LABEL: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getRecipeWithReconciliation(user!.id, id);
  if (!data) notFound();
  const { recipe, ingredients, reconciliation } = data;

  const availableSet = new Set(reconciliation.available);
  const time = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const steps = (recipe.instructions as string[]) ?? [];

  return (
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href="/meals" className="text-sm text-muted hover:text-ink">
          ← Meals
        </Link>
      </header>

      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">{recipe.name}</h1>
        <SaveToggle recipeId={recipe.id} saved={recipe.saved} showLabel />
      </div>
      {recipe.description && <p className="mt-1 text-sm text-muted">{recipe.description}</p>}
      <p className="mt-2 text-xs text-muted">
        {time > 0 ? `${time} min` : "quick"} · {DIFF_LABEL[recipe.difficulty] ?? recipe.difficulty} · serves{" "}
        {recipe.servings}
      </p>

      <section className="mt-6">
        <h2 className="mb-2 font-display text-lg text-ink">Ingredients</h2>
        <ul className="flex flex-col gap-1.5">
          {ingredients.map((ing, i) => {
            const have = availableSet.has(ing.name);
            return (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">
                  {ing.quantity ? `${ing.quantity} ` : ""}
                  {ing.unit ? `${ing.unit} ` : ""}
                  {ing.name}
                  {ing.optional && <span className="text-muted"> (optional)</span>}
                </span>
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                    have ? "bg-status-fresh/10 text-status-fresh" : "bg-accent-soft text-accent"
                  }`}
                >
                  {have ? "have" : "to buy"}
                </span>
              </li>
            );
          })}
        </ul>
        {reconciliation.missing.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            You need to buy {reconciliation.missing.length} item
            {reconciliation.missing.length === 1 ? "" : "s"}: {reconciliation.missing.join(", ")}.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-display text-lg text-ink">Steps</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-ink">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>

      {(recipe.storageNotes || recipe.leftoverNotes) && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          {recipe.storageNotes && (
            <p>
              <span className="font-medium text-ink">Storage:</span> {recipe.storageNotes}
            </p>
          )}
          {recipe.leftoverNotes && (
            <p className="mt-1">
              <span className="font-medium text-ink">Leftovers:</span> {recipe.leftoverNotes}
            </p>
          )}
        </section>
      )}

      <div className="mt-6 flex gap-3">
        <Link href={`/meals/${recipe.id}/cook`} className="flex-1">
          <Button className="w-full">Cook this</Button>
        </Link>
        <form action={addRecipeMissingAction} className="flex-1">
          <input type="hidden" name="recipeId" value={recipe.id} />
          <Button
            type="submit"
            variant="ghost"
            className="w-full border border-line"
            disabled={reconciliation.missing.length === 0}
          >
            {reconciliation.missing.length === 0
              ? "Nothing to buy"
              : `Add ${reconciliation.missing.length} to list`}
          </Button>
        </form>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Cooking deducts ingredients from inventory; &ldquo;Add to list&rdquo; sends the missing ones to Shopping.
      </p>
    </main>
  );
}
