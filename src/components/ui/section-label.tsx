import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The small uppercase heading over a group: Inventory buckets, Alerts, Shopping
 * aisles, Settings sections. DESIGN.md: Label type, uppercase, 0.1em tracking, Muted.
 */
export function SectionLabel({
  as: As = "h2",
  className,
  ...props
}: { as?: React.ElementType } & React.HTMLAttributes<HTMLElement>) {
  return <As className={cn("text-2xs font-semibold uppercase tracking-[0.1em] text-muted", className)} {...props} />;
}
