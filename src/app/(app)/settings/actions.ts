"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recomputeExpiryForUser } from "@/server/services/inventory";
import { updateAccessibilityPrefs } from "@/server/services/preferences";

export async function recalculateExpiry(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const count = await recomputeExpiryForUser(user.id);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/settings?recalculated=${count}`);
}

/** Save the Accessibility toggle group, called on every change with all three values. */
export async function saveAccessibility(prefs: {
  largerText: boolean;
  reduceMotion: boolean;
  absoluteDates: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Arguments from the client are untrusted: only a real `true` turns a setting on.
  await updateAccessibilityPrefs(user.id, {
    largerText: prefs?.largerText === true,
    reduceMotion: prefs?.reduceMotion === true,
    absoluteDates: prefs?.absoluteDates === true,
  });

  revalidatePath("/settings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
