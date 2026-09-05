import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExpiryBadge } from "./expiry-badge";
import { statusRailClass } from "./status-rail";
import { STORAGE_LABEL, type ItemCardData } from "./item-card";
import { classifyStatus, type ExpirySource } from "@/lib/expiry";

/**
 * Compact two-line inventory row [1o]B — for the non-urgent buckets (This week,
 * Fresh, No date) where fitting more rows on screen matters more than surfacing
 * actions inline. The whole row links to the item's use/detail route, where Use,
 * Edit and Remove all live, so nothing is lost by dropping the action strip.
 */
export function ItemRow({ item, absoluteDates = false }: { item: ItemCardData; absoluteDates?: boolean }) {
  const status = classifyStatus(item.expiryDate, item.expirySource as ExpirySource);
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
          statusRailClass(status),
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-medium text-ink">{item.productName}</span>
          <span className="mt-0.5 block text-[12.5px] text-muted tabular">{meta.join(" · ")}</span>
        </span>
        <ExpiryBadge
          expiryDate={item.expiryDate}
          source={item.expirySource as ExpirySource}
          absoluteDates={absoluteDates}
          className="shrink-0"
        />
      </Link>
    </li>
  );
}
