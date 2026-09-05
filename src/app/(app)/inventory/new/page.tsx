import { createClient } from "@/lib/supabase/server";
import { getFormReference } from "@/server/services/reference";
import { getRecentlyAddedItems } from "@/server/services/inventory";
import { ItemForm } from "@/components/inventory/item-form";
import { addInventoryItem } from "../actions";

export default async function NewItemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ categories, ingredients }, recent] = await Promise.all([
    getFormReference(),
    user ? getRecentlyAddedItems(user.id) : Promise.resolve([]),
  ]);

  return (
    <ItemForm
      action={addInventoryItem}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      ingredients={ingredients.map((i) => ({
        id: i.id,
        name: i.canonicalName,
        categoryId: i.categoryId,
        defaultUnit: i.defaultUnit,
      }))}
      recent={recent}
    />
  );
}
