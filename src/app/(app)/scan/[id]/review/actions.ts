"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { commitReceipt } from "@/server/services/receipt";
import { reviewedItemsSchema } from "@/server/ai/schemas";

export type CommitState = { error?: string };

export async function commitReceiptAction(_prev: CommitState, formData: FormData): Promise<CommitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const receiptId = String(formData.get("receiptId") ?? "");
  if (!receiptId) return { error: "Missing receipt." };

  let items;
  try {
    items = reviewedItemsSchema.parse(JSON.parse(String(formData.get("items") ?? "[]")));
  } catch {
    return { error: "Could not read the reviewed items." };
  }

  const result = await commitReceipt(user.id, receiptId, items);
  if (!result.ok) return { error: result.error };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/inventory?added=${result.count}`);
}
