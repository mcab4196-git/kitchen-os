import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInventoryItem } from "@/server/services/inventory";
import { ConsumeForm } from "./consume-form";

export default async function UseItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const item = await getInventoryItem(user!.id, id);
  if (!item) notFound();

  return (
    <ConsumeForm id={item.id} productName={item.productName} currentQuantity={item.quantity} unit={item.unit} />
  );
}
