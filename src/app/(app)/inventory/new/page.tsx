import { getFormReference } from "@/server/services/reference";
import { ItemForm } from "@/components/inventory/item-form";
import { addInventoryItem } from "../actions";

export default async function NewItemPage() {
  const { categories, ingredients } = await getFormReference();
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
    />
  );
}
