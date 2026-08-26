import { prisma } from "@/server/db";

/** Reference data for building the add/edit form. */
export async function getFormReference() {
  const [categories, ingredients] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.ingredient.findMany({
      orderBy: { canonicalName: "asc" },
      include: { category: true },
    }),
  ]);
  return { categories, ingredients };
}

/**
 * Resolve a free-text name to a canonical ingredient via the alias table
 * (lower-cased exact match). This is the lightweight, manual-add version of the
 * normalization step; the AI-driven version arrives in M2. Returns null when
 * there's no confident match — we never guess.
 */
export async function resolveIngredientByText(text: string) {
  const alias = text.trim().toLowerCase();
  if (!alias) return null;
  const match = await prisma.ingredientAlias.findUnique({
    where: { aliasText: alias },
    include: { ingredient: { include: { category: true } } },
  });
  return match?.ingredient ?? null;
}
