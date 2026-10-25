"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { preferencesFromForm } from "@/lib/preferences-form";
import { getPreferences, updatePreferences } from "@/server/services/preferences";

export type PrefsState = { error?: string; saved?: boolean };

export async function savePreferences(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The shared reader bounds every field; anything missing keeps the saved value.
  const current = await getPreferences(user.id);
  const thresholds = (current.notificationThresholds ?? {}) as { expiringDays?: number };
  await updatePreferences(
    user.id,
    preferencesFromForm(formData, {
      householdSize: current.householdSize,
      diet: current.diet,
      allergies: current.allergies,
      dislikes: current.dislikes,
      cuisines: current.cuisines,
      skill: current.skill,
      maxCookMinutes: current.maxCookMinutes,
      unitSystem: current.unitSystem,
      currency: current.currency,
      expiringDays: thresholds.expiringDays ?? 2,
    }),
  );

  revalidatePath("/settings/preferences");
  return { saved: true };
}
