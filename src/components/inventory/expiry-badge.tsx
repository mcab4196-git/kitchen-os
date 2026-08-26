import { classifyStatus, relativeLabel, type ExpirySource } from "@/lib/expiry";

const STYLE: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  EXPIRED: { dot: "bg-status-critical", text: "text-status-critical", bg: "bg-status-critical/10", label: "Expired" },
  CRITICAL: { dot: "bg-status-critical", text: "text-status-critical", bg: "bg-status-critical/10", label: "Use now" },
  SOON: { dot: "bg-status-soon", text: "text-status-soon", bg: "bg-status-soon/10", label: "Use soon" },
  FRESH: { dot: "bg-status-fresh", text: "text-status-fresh", bg: "bg-status-fresh/10", label: "Fresh" },
  UNKNOWN: { dot: "bg-status-unknown", text: "text-status-unknown", bg: "bg-status-unknown/10", label: "No date" },
};

export function ExpiryBadge({
  expiryDate,
  source,
}: {
  expiryDate: Date | null;
  source: ExpirySource;
}) {
  const status = classifyStatus(expiryDate, source);
  const s = STYLE[status];
  const rel = relativeLabel(expiryDate, source);
  const estimated = source === "ESTIMATED" && status !== "UNKNOWN";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${s.bg} px-2.5 py-1 text-xs font-medium ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {status === "UNKNOWN" ? s.label : `${s.label} · ${rel}`}
      {estimated && <span className="opacity-70">(est.)</span>}
    </span>
  );
}
