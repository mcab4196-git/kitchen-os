"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateSuggestions } from "@/server/services/recipe";

export type MealsState = { error?: string };

export async function whatsForDinner(_prev: MealsState, _formData: FormData): Promise<MealsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await generateSuggestions(user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath("/meals");
  redirect("/meals?generated=1");
}

export async function toggleSavedAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("recipeId") ?? "");
  if (id) {
    const { toggleSaved } = await import("@/server/services/recipe");
    await toggleSaved(user.id, id);
  }
  revalidatePath("/meals");
  revalidatePath(`/meals/${id}`);
}
