"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
    return { error: "Could not read the cook plan." };
  }

  const problems: string[] = [];
  let deducted = 0;
  for (const l of lines) {
    if (!l.include || !l.useQuantity || l.useQuantity <= 0) continue;
    const res = await consumeInventoryItem(user.id, l.inventoryItemId, l.useQuantity, l.useUnit, recipeId);
    if (res.ok) deducted++;
    else problems.push(res.reason);
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  if (deducted === 0 && problems.length > 0) return { error: problems[0] };
  redirect(`/inventory?cooked=${deducted}`);
}
