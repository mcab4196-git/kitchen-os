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

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Something went wrong reading that form. Reload the page and try again." };
  }
  const parsed = reviewedItemsSchema.safeParse(raw);
  if (!parsed.success) {
    // PLAN 5.4: point at the line, so the fix is one Edit away rather than a hunt.
    const [index, field] = parsed.error.issues[0]?.path ?? [];
    const line = Array.isArray(raw) && typeof index === "number" ? (raw[index] as { rawName?: unknown }) : null;
    const what = field === "productName" ? "a name" : field === "quantity" ? "an amount above 0" : null;
    if (line && typeof line.rawName === "string" && what) {
      return { error: `“${line.rawName}” needs ${what}. Tap Edit on that line, or untick it.` };
    }
    return { error: "Something went wrong reading that form. Reload the page and try again." };
  }
  const items = parsed.data;

  const result = await commitReceipt(user.id, receiptId, items);
  if (!result.ok) return { error: result.error };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/inventory?added=${result.count}`);
}
