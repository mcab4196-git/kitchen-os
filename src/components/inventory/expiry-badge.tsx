import { classifyStatus, relativeLabel, type ExpirySource, type ExpiryStatus } from "@/lib/expiry";
import { Badge, type Tone } from "@/components/ui/badge";

/** The word for each status, shared with the freshness bar so the two can't drift. */
export const EXPIRY_WORD: Record<ExpiryStatus, string> = {
  EXPIRED: "Expired",
  CRITICAL: "Use now",
  SOON: "Use soon",
  FRESH: "Fresh",
  UNKNOWN: "No date",
};

const TONE: Record<ExpiryStatus, Tone> = {
  EXPIRED: "critical",
  CRITICAL: "critical",
  SOON: "soon",
  FRESH: "fresh",
  UNKNOWN: "unknown",
};

export function ExpiryBadge({
  expiryDate,
  source,
  pulse = false,
  absoluteDates = false,
  className,
}: {
  expiryDate: Date | null;
  source: ExpirySource;
  /** Single attention beat on first paint — reserve for triage surfaces. */
  pulse?: boolean;
  /** "Show expiry dates as text" preference — "7 Sep" instead of "in 2 days". */
  absoluteDates?: boolean;
  className?: string;
}) {
  const status = classifyStatus(expiryDate, source);
  const tone = TONE[status];
  const label = EXPIRY_WORD[status];
  const rel = relativeLabel(expiryDate, source, undefined, { absolute: absoluteDates });
  const estimated = source === "ESTIMATED" && status !== "UNKNOWN";
  const urgent = status === "CRITICAL" || status === "EXPIRED";

  return (
    <Badge tone={tone} dot pulse={pulse && urgent} className={className}>
      {status === "UNKNOWN" ? label : `${label} · ${rel}`}
      {estimated && <span className="opacity-70">est.</span>}
    </Badge>
  );
}
