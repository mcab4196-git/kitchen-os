"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateMealPlan } from "@/server/services/recipe";

export type PlanState = { error?: string };

export async function makePlan(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const days = Number(formData.get("days")) === 7 ? 7 : 3;
  const result = await generateMealPlan(user.id, days);
  if (!result.ok) return { error: result.error };

  revalidatePath("/plan");
  redirect(`/plan?planned=${result.plannedDays}`);
}
