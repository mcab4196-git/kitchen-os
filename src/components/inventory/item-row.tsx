import Link from "next/link";
import { cn } from "@/lib/utils";
import { FreshnessBar } from "./freshness-bar";
import { STORAGE_LABEL, type ItemCardData } from "./item-card";
import { type ExpirySource } from "@/lib/expiry";

/**
 * Compact two-line inventory row [1o]B — for the non-urgent buckets (This week,
 * Fresh, No date) where fitting more rows on screen matters more than surfacing
 * actions inline. The whole row links to the item's use/detail route, where Use,
 * Edit and Remove all live, so nothing is lost by dropping the action strip.
 * The freshness bar replaced the side rail and the badge [5.8].
 */
export function ItemRow({ item, absoluteDates = false }: { item: ItemCardData; absoluteDates?: boolean }) {
  const meta = [
    `${item.quantity} ${item.unit}`,
    STORAGE_LABEL[item.storageLocation] ?? item.storageLocation,
    item.opened ? "opened" : null,
  ].filter(Boolean);

  return (
    <li className="list-none">
      <Link
        href={`/inventory/${item.id}/use`}
        className={cn(
          "group flex min-h-[3.75rem] items-center gap-3 rounded-control border border-line bg-card px-3 py-2.5",
          "transition duration-fast ease-out hover:border-line-strong hover:shadow-card active:translate-y-px",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-compact font-medium text-ink">{item.productName}</span>
          <span className="mt-0.5 block text-small text-muted tabular">{meta.join(" · ")}</span>
        </span>
        <FreshnessBar
          expiryDate={item.expiryDate}
          source={item.expirySource as ExpirySource}
          since={item.purchaseDate ?? item.createdAt}
          absoluteDates={absoluteDates}
          className="shrink-0"
        />
      </Link>
    </li>
  );
}
