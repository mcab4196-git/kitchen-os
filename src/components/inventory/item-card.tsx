import { FreshnessBar } from "./freshness-bar";
import { type ExpirySource } from "@/lib/expiry";
import { Card } from "@/components/ui/card";
import { ItemActions } from "./item-actions";

export const STORAGE_LABEL: Record<string, string> = {
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
  purchaseDate: Date | null;
  createdAt: Date;
  category: { name: string } | null;
}

export function ItemCard({ item, absoluteDates = false }: { item: ItemCardData; absoluteDates?: boolean }) {
  const usedUp = item.quantity <= 0;
  const meta = [
    `${item.quantity} ${item.unit}`,
    item.category?.name,
    STORAGE_LABEL[item.storageLocation] ?? item.storageLocation,
    item.opened ? "opened" : null,
  ].filter(Boolean);

  return (
    <Card as="li" className="list-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">
            {item.productName}
            {usedUp && (
              <span className="ml-2 align-middle text-2xs font-medium uppercase tracking-wide text-faint">
                used up
              </span>
            )}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted tabular">
            {meta.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="h-0.5 w-0.5 rounded-full bg-faint" aria-hidden />}
                {m}
              </span>
            ))}
          </p>
        </div>
        <FreshnessBar
          expiryDate={item.expiryDate}
          source={item.expirySource as ExpirySource}
          since={item.purchaseDate ?? item.createdAt}
          absoluteDates={absoluteDates}
          className="shrink-0 pt-0.5"
        />
      </div>

      <ItemActions
        id={item.id}
        productName={item.productName}
        quantity={item.quantity}
        unit={item.unit}
        storageLabel={STORAGE_LABEL[item.storageLocation] ?? item.storageLocation}
      />
    </Card>
  );
}
