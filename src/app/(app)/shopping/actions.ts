"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addManualItem,
  addRecipeMissing,
  toggleChecked,
  removeItem,
  clearChecked,
} from "@/server/services/shopping";

async function uid(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

export async function addItemAction(formData: FormData): Promise<void> {
  const userId = await uid();
  const label = String(formData.get("label") ?? "");
  const qtyRaw = String(formData.get("quantity") ?? "");
  const unit = String(formData.get("unit") ?? "") || null;
  const quantity = qtyRaw ? Number(qtyRaw) : null;
  await addManualItem(userId, label, Number.isFinite(quantity) ? quantity : null, unit);
  revalidatePath("/shopping");
}

export async function toggleCheckedAction(formData: FormData): Promise<void> {
  const userId = await uid();
  const id = String(formData.get("itemId") ?? "");
  if (id) await toggleChecked(userId, id);
  revalidatePath("/shopping");
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const userId = await uid();
  const id = String(formData.get("itemId") ?? "");
  if (id) await removeItem(userId, id);
  revalidatePath("/shopping");
}

export async function clearCheckedAction(): Promise<void> {
  const userId = await uid();
  await clearChecked(userId);
  revalidatePath("/shopping");
}

/** Called from a recipe page: add its missing ingredients, then go to the list. */
export async function addRecipeMissingAction(formData: FormData): Promise<void> {
  const userId = await uid();
  const recipeId = String(formData.get("recipeId") ?? "");
  const { added } = recipeId ? await addRecipeMissing(userId, recipeId) : { added: 0 };
  revalidatePath("/shopping");
  redirect(`/shopping?added=${added}`);
}
