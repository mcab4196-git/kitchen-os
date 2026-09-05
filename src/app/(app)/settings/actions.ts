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

/** Save the Accessibility toggle group. Submits on every change. */
export async function saveAccessibility(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await updateAccessibilityPrefs(user.id, {
    largerText: formData.get("largerText") === "on",
    reduceMotion: formData.get("reduceMotion") === "on",
    absoluteDates: formData.get("absoluteDates") === "on",
  });

  revalidatePath("/settings");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
