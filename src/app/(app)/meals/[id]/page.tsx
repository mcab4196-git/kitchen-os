import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRecipeWithReconciliation } from "@/server/services/recipe";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { SaveToggle } from "@/components/recipe/save-toggle";
import { SubmitButton } from "@/components/ui/feedback";
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
  const missingCount = reconciliation.missing.length;

  return (
    <main className="animate-fade-in pb-24">
      <PageHeader
        title={recipe.name}
        back="/meals"
        size="md"
        actions={<SaveToggle recipeId={recipe.id} saved={recipe.saved} showLabel />}
      />

      {recipe.description && <p className="-mt-3 mb-2 text-sm leading-6 text-muted">{recipe.description}</p>}
      <div className="flex items-center gap-3 text-[13px] text-muted tabular">
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" size={14} />
          {time > 0 ? `${time} min` : "quick"}
        </span>
        <span>{DIFF_LABEL[recipe.difficulty] ?? recipe.difficulty}</span>
        <span>serves {recipe.servings}</span>
      </div>

      <section className="mt-7">
        <h2 className="mb-3 font-display text-title-sm text-ink">Ingredients</h2>
        <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-card">
          {ingredients.map((ing, i) => {
            const have = availableSet.has(ing.name);
            return (
              <li key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="text-ink">
                  {ing.quantity ? `${ing.quantity} ` : ""}
                  {ing.unit ? `${ing.unit} ` : ""}
                  {ing.name}
                  {ing.optional && <span className="text-muted"> (optional)</span>}
                </span>
                <Badge tone={have ? "fresh" : "accent"} className="shrink-0">
                  {have ? "have" : "to buy"}
                </Badge>
              </li>
            );
          })}
        </ul>
        {missingCount > 0 && (
          <p className="mt-3 text-[13px] text-muted">
            You need to buy {missingCount} item{missingCount === 1 ? "" : "s"}: {reconciliation.missing.join(", ")}.
          </p>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-3 font-display text-title-sm text-ink">Steps</h2>
        <ol className="flex flex-col gap-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-ink tabular">
                {i + 1}
              </span>
              <p className="text-read text-ink">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      {(recipe.storageNotes || recipe.leftoverNotes) && (
        <section className="mt-7 rounded-card border border-line bg-surface-2/60 p-4 text-[13px] leading-5 text-muted">
          {recipe.storageNotes && (
            <p>
              <span className="font-semibold text-ink">Storage:</span> {recipe.storageNotes}
            </p>
          )}
          {recipe.leftoverNotes && (
            <p className="mt-1.5">
              <span className="font-semibold text-ink">Leftovers:</span> {recipe.leftoverNotes}
            </p>
          )}
        </section>
      )}

      <div className="sticky bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+0.75rem)] z-10 mt-8 -mx-4 border-t border-line bg-surface/85 px-4 py-3 backdrop-blur-md lg:bottom-4 lg:mx-0 lg:rounded-card lg:border">
        <div className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href={`/meals/${recipe.id}/cook`}>
              <Icon name="flame" size={16} />
              Cook this
            </Link>
          </Button>
          <form action={addRecipeMissingAction} className="flex-1">
            <input type="hidden" name="recipeId" value={recipe.id} />
            <SubmitButton variant="secondary" className="w-full" disabled={missingCount === 0}>
              {missingCount === 0 ? "Nothing to buy" : `Add ${missingCount} to list`}
            </SubmitButton>
          </form>
        </div>
        <p className="mt-2 text-center text-2xs text-faint">
          Cooking deducts ingredients from inventory · “Add to list” sends the missing ones to Shopping.
        </p>
      </div>
    </main>
  );
}
