import type { ExpiryStatus } from "@/lib/expiry";

/**
 * The 4px left rail that runs alongside an ExpiryBadge on list rows and cards.
 * Colour is derived from the *same* `classifyStatus` result the badge uses, so a
 * row's rail and its badge can never drift apart. Rail is decoration only — the
 * word in the badge carries the meaning for screen readers and greyscale.
 */
export function statusRailClass(status: ExpiryStatus): string {
  switch (status) {
    case "EXPIRED":
    case "CRITICAL":
      return "border-l-4 border-l-status-critical";
    case "SOON":
      return "border-l-4 border-l-status-soon";
    case "FRESH":
      return "border-l-4 border-l-status-fresh";
    default:
      return "border-l-4 border-l-status-unknown";
  }
}
