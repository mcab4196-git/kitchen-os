"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addInventoryItemsToList } from "@/server/services/shopping";

/** "Dinner done" [5.8]: put what the dinner used up back on the shopping list. */
export async function addRanOutAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ids = String(formData.get("itemIds") ?? "").split(",").filter(Boolean);
  const { added } = await addInventoryItemsToList(user.id, ids);
  revalidatePath("/shopping");
  redirect(`/shopping?added=${added}`);
}
