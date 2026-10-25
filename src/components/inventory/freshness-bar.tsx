import { classifyStatus, freshness, relativeLabel, type ExpirySource, type ExpiryStatus } from "@/lib/expiry";
import { cn } from "@/lib/utils";
import { EXPIRY_WORD } from "./expiry-badge";

/** Status text colours, shared with Review's estimates (PLAN 5.4). */
export const EXPIRY_TEXT: Record<ExpiryStatus, string> = {
  EXPIRED: "text-status-critical-fg",
  CRITICAL: "text-status-critical-fg",
  SOON: "text-status-soon-fg",
  FRESH: "text-status-fresh-fg",
  UNKNOWN: "text-status-unknown-fg",
};

const FILL: Record<ExpiryStatus, string> = {
  EXPIRED: "",
  CRITICAL: "bg-status-critical",
  SOON: "bg-status-soon-bar",
  FRESH: "bg-status-fresh",
  UNKNOWN: "",
};

/**
 * Freshness bar [5.5]: the expiry label, with a bar under it showing how much
 * shelf life is left. The bar is decoration (aria-hidden, never a number) because
 * the label already says it: DESIGN.md, "The Label Carries It Rule". Labels go
 * through `relativeLabel` like every other expiry surface.
 */
export function FreshnessBar({
  expiryDate,
  source,
  since,
  absoluteDates = false,
  className,
}: {
  expiryDate: Date | null;
  source: ExpirySource;
  /** Purchase date, or the date added when there isn't one. */
  since: Date;
  absoluteDates?: boolean;
  className?: string;
}) {
  const status = classifyStatus(expiryDate, source);
  const left = freshness(expiryDate, source, since);
  const rel = relativeLabel(expiryDate, source, undefined, { absolute: absoluteDates });
  const estimated = source === "ESTIMATED" && status !== "UNKNOWN";
  // A "today" item can already be a few hours past its midnight date; keep a
  // sliver so it never reads as expired while its label says "Use now".
  const width = status === "EXPIRED" || left == null ? 0 : Math.max(left, 0.04);

  return (
    <span className={cn("block w-40", className)}>
      <span className={cn("mb-1.5 block whitespace-nowrap text-right text-2xs font-semibold", EXPIRY_TEXT[status])}>
        {status === "UNKNOWN" ? EXPIRY_WORD.UNKNOWN : `${EXPIRY_WORD[status]} · ${rel}`}
        {estimated && <span className="font-medium opacity-75"> est.</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "block h-1.5 overflow-hidden rounded-full",
          status === "UNKNOWN" ? "hatch bg-line/40" : "bg-line/80",
          status === "EXPIRED" && "ring-1 ring-inset ring-status-critical-border",
        )}
      >
        {width > 0 && (
          <span className={cn("block h-full rounded-full", FILL[status])} style={{ width: `${Math.round(width * 100)}%` }} />
        )}
      </span>
    </span>
  );
}
