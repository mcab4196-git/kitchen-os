"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { consumeInventoryItem } from "@/server/services/inventory";

export type CookState = { error?: string };

const lineSchema = z.object({
  inventoryItemId: z.string(),
  include: z.boolean(),
  useQuantity: z.number().nonnegative().nullable(),
  useUnit: z.string(),
});
const linesSchema = z.array(lineSchema);

export async function cookRecipe(_prev: CookState, formData: FormData): Promise<CookState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipeId = String(formData.get("recipeId") ?? "");
  let lines;
  try {
    lines = linesSchema.parse(JSON.parse(String(formData.get("lines") ?? "[]")));
  } catch {
    return { error: "Something went wrong reading that form. Reload the page and try again." };
  }

  const problems: string[] = [];
  const recordIds: string[] = [];
  let overused = 0;
  for (const l of lines) {
    if (!l.include || !l.useQuantity || l.useQuantity <= 0) continue;
    const res = await consumeInventoryItem(user.id, l.inventoryItemId, l.useQuantity, l.useUnit, recipeId);
    if (res.ok) {
      recordIds.push(res.recordId);
      if (res.overuse) overused++; // used more than was in stock — clamped to 0
    } else problems.push(res.reason);
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  if (recordIds.length === 0 && problems.length > 0) return { error: problems[0] };
  const over = overused > 0 ? `&over=${overused}` : "";
  // PLAN 5.6: lines that failed are reported, not silently dropped.
  const skipped = problems.length > 0 ? `&skipped=${problems.length}` : "";
  // [5.8] Land on the "Dinner done" summary; with nothing deducted there's nothing to sum up.
  if (recordIds.length === 0 || !isUuid(recipeId)) redirect(`/inventory?cooked=${recordIds.length}${over}${skipped}`);
  redirect(`/meals/${recipeId}/done?r=${recordIds.join(",")}${over}${skipped}`);
}
