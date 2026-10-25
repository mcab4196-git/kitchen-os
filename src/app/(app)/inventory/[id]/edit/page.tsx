import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInventoryItem } from "@/server/services/inventory";
import { getFormReference } from "@/server/services/reference";
import { ItemForm } from "@/components/inventory/item-form";
import { editInventoryItem } from "../../actions";

function toDateInput(d: Date | null): string | undefined {
  return d ? new Date(d).toISOString().slice(0, 10) : undefined;
}

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [item, ref] = await Promise.all([getInventoryItem(user!.id, id), getFormReference()]);
  if (!item) notFound();

  return (
    <ItemForm
      action={editInventoryItem}
      submitLabel="Save changes"
      categories={ref.categories.map((c) => ({ id: c.id, name: c.name }))}
      ingredients={ref.ingredients.map((i) => ({
        id: i.id,
        name: i.canonicalName,
        categoryId: i.categoryId,
        defaultUnit: i.defaultUnit,
      }))}
      initial={{
        id: item.id,
        productName: item.productName,
        ingredientName: item.ingredient?.canonicalName ?? "",
        categoryId: item.categoryId ?? "",
        quantity: item.quantity,
        unit: item.unit,
        storageLocation: item.storageLocation,
        purchaseDate: toDateInput(item.purchaseDate),
        // Only prefill the exact-date field if the user had set an exact date;
        // an estimated date stays blank so re-saving keeps re-estimating.
        exactExpiryDate: item.expirySource === "EXACT" ? toDateInput(item.expiryDate) : undefined,
        opened: item.opened,
        price: item.price,
        currency: item.currency ?? "PHP",
        notes: item.notes ?? "",
      }}
    />
  );
}
