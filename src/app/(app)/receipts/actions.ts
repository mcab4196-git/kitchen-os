"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteReceipt } from "@/server/services/receipt";

/** Receipt history: delete one receipt and its photo for good. */
export async function deleteReceiptAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await deleteReceipt(user.id, String(formData.get("receiptId") ?? ""));
  revalidatePath("/receipts");
  redirect(ok ? "/receipts?receiptDeleted=1" : "/receipts?receiptDeleteFailed=1");
}
