"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recomputeExpiryForUser } from "@/server/services/inventory";

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
