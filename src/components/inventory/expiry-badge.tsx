import { classifyStatus, relativeLabel, type ExpirySource } from "@/lib/expiry";
import { Badge, type Tone } from "@/components/ui/badge";

const MAP: Record<string, { tone: Tone; label: string }> = {
  EXPIRED: { tone: "critical", label: "Expired" },
  CRITICAL: { tone: "critical", label: "Use now" },
  SOON: { tone: "soon", label: "Use soon" },
  FRESH: { tone: "fresh", label: "Fresh" },
  UNKNOWN: { tone: "unknown", label: "No date" },
};

export function ExpiryBadge({
  expiryDate,
  source,
  pulse = false,
  className,
}: {
  expiryDate: Date | null;
  source: ExpirySource;
  /** Single attention beat on first paint — reserve for triage surfaces. */
  pulse?: boolean;
  className?: string;
}) {
  const status = classifyStatus(expiryDate, source);
  const { tone, label } = MAP[status];
  const rel = relativeLabel(expiryDate, source);
  const estimated = source === "ESTIMATED" && status !== "UNKNOWN";
  const urgent = status === "CRITICAL" || status === "EXPIRED";

  return (
    <Badge tone={tone} dot pulse={pulse && urgent} className={className}>
      {status === "UNKNOWN" ? label : `${label} · ${rel}`}
      {estimated && <span className="opacity-70">est.</span>}
    </Badge>
  );
}
