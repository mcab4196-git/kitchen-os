"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePreferences } from "@/server/services/preferences";

export type PrefsState = { error?: string; saved?: boolean };

function list(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function int(v: FormDataEntryValue | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export async function savePreferences(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await updatePreferences(user.id, {
    householdSize: int(formData.get("householdSize"), 2),
    diet: String(formData.get("diet") ?? "") || null,
    allergies: list(formData.get("allergies")),
    dislikes: list(formData.get("dislikes")),
    cuisines: list(formData.get("cuisines")),
    skill: String(formData.get("skill") ?? "intermediate"),
    maxCookMinutes: int(formData.get("maxCookMinutes"), 45),
    unitSystem: String(formData.get("unitSystem") ?? "metric"),
    currency: String(formData.get("currency") ?? "EUR").toUpperCase(),
    expiringDays: int(formData.get("expiringDays"), 2),
  });

  revalidatePath("/settings/preferences");
  return { saved: true };
}
