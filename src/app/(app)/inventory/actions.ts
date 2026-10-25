"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createInventoryItem,
  updateInventoryItem,
  consumeInventoryItem,
  softDeleteInventoryItem,
  restoreInventoryItem,
  type CreateItemInput,
} from "@/server/services/inventory";
import type { StorageLocation } from "@prisma/client";

export type ItemFormState = { error?: string };

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

/** Parse + validate the shared add/edit form fields. */
function parseItemForm(formData: FormData): { input?: CreateItemInput; error?: string } {
  const productName = String(formData.get("productName") ?? "").trim();
  const quantity = num(formData.get("quantity"));
  const unit = String(formData.get("unit") ?? "").trim();

  if (!productName) return { error: "Give the item a name." };
  if (quantity == null || quantity < 0) return { error: "Enter a valid quantity." };
  if (!unit) return { error: "Choose a unit." };

  const purchaseRaw = String(formData.get("purchaseDate") ?? "");
  const exactRaw = String(formData.get("exactExpiryDate") ?? "");

  return {
    input: {
      productName,
      ingredientName: String(formData.get("ingredientName") ?? "") || null,
      categoryId: String(formData.get("categoryId") ?? "") || null,
      quantity,
      unit,
      storageLocation: String(formData.get("storageLocation") ?? "PANTRY") as StorageLocation,
      purchaseDate: purchaseRaw ? new Date(purchaseRaw) : new Date(),
      opened: formData.get("opened") === "on",
      exactExpiryDate: exactRaw ? new Date(exactRaw) : null,
      price: num(formData.get("price")),
      currency: String(formData.get("currency") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  };
}

export async function addInventoryItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const userId = await requireUserId();
  const { input, error } = parseItemForm(formData);
  if (error || !input) return { error };
  await createInventoryItem(userId, input);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}

export async function editInventoryItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing item id." };
  const { input, error } = parseItemForm(formData);
  if (error || !input) return { error };
  await updateInventoryItem(userId, id, input);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}

export async function consumeItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const useUnit = String(formData.get("useUnit") ?? "").trim();
  const useAll = formData.get("useAll") === "1";
  const useQuantity = useAll ? num(formData.get("currentQuantity")) : num(formData.get("useQuantity"));

  if (!id) return { error: "Missing item id." };
  if (useQuantity == null || useQuantity <= 0) return { error: "Enter how much you used." };

  const result = await consumeInventoryItem(userId, id, useQuantity, useUnit);
  if (!result.ok) return { error: result.reason };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  // PLAN 5.6: say it worked. Overuse has its own toast.
  redirect(result.overuse ? "/inventory?over=1" : `/inventory?used=${result.usedUp ? "up" : "some"}`);
}

/** Soft-delete then send the user back to the list with an Undo affordance. */
export async function deleteItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (id) await softDeleteInventoryItem(userId, id);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/inventory?undo=${id}`);
}

export async function restoreItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (id) await restoreInventoryItem(userId, id);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}
