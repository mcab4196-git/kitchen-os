import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db";
import { listCurrentSuggestions, listSaved } from "@/server/services/recipe";
import { reconcileRecipe, type RecipeIngredientLite } from "@/lib/recipe";
import { classifyStatus, type ExpirySource } from "@/lib/expiry";
import { DinnerButton } from "./dinner-button";
import { SaveToggle } from "@/components/recipe/save-toggle";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";

const DIFF_LABEL: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };
const SOON = new Set(["CRITICAL", "SOON", "EXPIRED"]);

type RecipeCardData = {
  id: string;
  name: string;
  description: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  difficulty: string;
  servings: number;
  saved: boolean;
  missing: number;
  usesExpiring: number;
};

function ingredientsOf(nutrition: unknown): RecipeIngredientLite[] {
  const n = (nutrition ?? {}) as { ingredientList?: RecipeIngredientLite[] };
  return n.ingredientList ?? [];
}

function RecipeCard({ r }: { r: RecipeCardData }) {
  const time = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
  return (
    <Card
      as="li"
      interactive
      // The link fills the card, so keyboard focus rings the whole card (WCAG 2.4.7).
      className="group list-none has-[a:focus-visible]:outline has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand"
    >
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
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2xs text-muted tabular">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={13} />
              {time > 0 ? `${time} min` : "quick"}
            </span>
            <span>{DIFF_LABEL[r.difficulty] ?? r.difficulty}</span>
            <span>serves {r.servings}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {r.usesExpiring > 0 ? (
              <Badge tone="fresh">
                <Icon name="check" size={12} strokeWidth={2.5} />
                Uses {r.usesExpiring} expiring
              </Badge>
            ) : r.missing === 0 ? (
              <Badge tone="fresh">
                <Icon name="check" size={12} strokeWidth={2.5} />
                Nothing to buy
              </Badge>
            ) : (
              <Badge tone="accent">
                Buy {r.missing} item{r.missing === 1 ? "" : "s"}
              </Badge>
            )}
            <Badge tone="neutral">{r.saved ? "Saved recipe" : "AI suggestion"}</Badge>
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
  const userId = user!.id;

  const [suggestions, inv] = await Promise.all([
    listCurrentSuggestions(userId),
    prisma.inventoryItem.findMany({
      where: { userId, isDeleted: false, quantity: { gt: 0 } },
      include: { ingredient: true },
    }),
  ]);
  const saved = await listSaved(userId, suggestions.map((s) => s.id));

  // Inventory tokens for per-card reconciliation — the same matching the recipe
  // detail page and the suggestion pipeline use.
  const now = new Date();
  const tokens: string[] = [];
  const soonTokens: string[] = [];
  for (const i of inv) {
    const t = [i.productName, i.ingredient?.canonicalName].filter(Boolean) as string[];
    tokens.push(...t);
    const soon =
      i.expiryDate != null &&
      i.expirySource !== "UNKNOWN" &&
      SOON.has(classifyStatus(i.expiryDate, i.expirySource as ExpirySource, now));
    if (soon) soonTokens.push(...t.map((x) => x.toLowerCase()));
  }

  const toCard = (r: (typeof suggestions)[number]): RecipeCardData => {
    const ings = ingredientsOf(r.nutrition);
    const usesExpiring = ings.filter((ing) => {
      const nm = ing.name.toLowerCase();
      return soonTokens.some((s) => nm.includes(s) || s.includes(nm));
    }).length;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      difficulty: r.difficulty,
      servings: r.servings,
      saved: r.saved,
      missing: reconcileRecipe(ings, tokens).missing.length,
      usesExpiring,
    };
  };

  const suggestionCards = suggestions.map(toCard);
  const savedCards = saved.map(toCard);

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Cook"
        subtitle="Your saved recipes come first — the AI only fills the gaps."
        actions={
          <Link
            href="/plan"
            className="inline-flex min-h-11 items-center gap-1 rounded-control border border-line bg-card px-3 text-[13px] font-medium text-ink transition-colors duration-fast hover:bg-surface-2"
          >
            <Icon name="calendar" size={15} />
            Plan week
          </Link>
        }
      />

      <DinnerButton itemCount={inv.length} />

      {suggestionCards.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-title-sm text-ink">Tonight&apos;s ideas</h2>
          <ul className="flex flex-col gap-3">
            {suggestionCards.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {savedCards.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-title-sm text-ink">Saved recipes</h2>
          <ul className="flex flex-col gap-3">
            {savedCards.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {suggestionCards.length === 0 && savedCards.length === 0 && (
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
