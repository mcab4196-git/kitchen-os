import Link from "next/link";
import { ExpiryBadge } from "./expiry-badge";
import type { ExpirySource } from "@/lib/expiry";
import { deleteItem } from "@/app/(app)/inventory/actions";

const STORAGE_LABEL: Record<string, string> = {
  REFRIGERATOR: "Fridge",
  FREEZER: "Freezer",
  PANTRY: "Pantry",
  CUPBOARD: "Cupboard",
  OTHER: "Other",
};

export interface ItemCardData {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  opened: boolean;
  expiryDate: Date | null;
  expirySource: string;
  category: { name: string } | null;
}

export function ItemCard({ item }: { item: ItemCardData }) {
  const usedUp = item.quantity <= 0;
  return (
    <li className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {item.productName}
            {usedUp && <span className="ml-2 text-xs font-normal text-status-unknown">used up</span>}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {item.quantity} {item.unit}
            {item.category ? ` · ${item.category.name}` : ""}
            {` · ${STORAGE_LABEL[item.storageLocation] ?? item.storageLocation}`}
            {item.opened ? " · opened" : ""}
          </p>
        </div>
        <ExpiryBadge expiryDate={item.expiryDate} source={item.expirySource as ExpirySource} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <Link href={`/inventory/${item.id}/use`} className="font-medium text-brand">
          Use
        </Link>
        <Link href={`/inventory/${item.id}/edit`} className="text-muted hover:text-ink">
          Edit
        </Link>
        <form action={deleteItem} className="ml-auto">
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="text-muted hover:text-status-critical">
            Remove
          </button>
        </form>
      </div>
    </li>
  );
}
