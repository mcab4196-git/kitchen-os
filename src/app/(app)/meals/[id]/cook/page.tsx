import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildCookPlan } from "@/server/services/recipe";
import { CookForm } from "./cook-form";

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plan = await buildCookPlan(user!.id, id);
  if (!plan) notFound();

  return <CookForm recipeId={plan.recipe.id} recipeName={plan.recipe.name} initial={plan.lines} />;
}
