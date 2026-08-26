"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAndParseReceipt } from "@/server/services/receipt";

export type ScanState = { error?: string };

export async function uploadReceipt(_prev: ScanState, formData: FormData): Promise<ScanState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a receipt photo first." };
  }

  const result = await createAndParseReceipt(user.id, file);
  if (!result.ok) {
    if (result.duplicateOf) redirect(`/scan/${result.duplicateOf}/review?dup=1`);
    return { error: result.error };
  }
  redirect(`/scan/${result.receiptId}/review`);
}
