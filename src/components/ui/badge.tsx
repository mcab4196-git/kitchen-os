import * as React from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "brand" | "accent" | "critical" | "soon" | "fresh" | "unknown";

const tones: Record<Tone, { wrap: string; dot: string }> = {
  neutral: { wrap: "bg-surface-2 text-muted border-line", dot: "bg-faint" },
  brand: { wrap: "bg-brand-soft text-brand-ink border-brand/20", dot: "bg-brand" },
  accent: { wrap: "bg-accent-soft text-accent-fg border-accent/25", dot: "bg-accent" },
  critical: { wrap: "bg-status-critical-bg text-status-critical-fg border-status-critical-border", dot: "bg-status-critical" },
  soon: { wrap: "bg-status-soon-bg text-status-soon-fg border-status-soon-border", dot: "bg-status-soon" },
  fresh: { wrap: "bg-status-fresh-bg text-status-fresh-fg border-status-fresh-border", dot: "bg-status-fresh" },
  unknown: { wrap: "bg-status-unknown-bg text-status-unknown-fg border-status-unknown-border", dot: "bg-status-unknown" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  pulse = false,
  className,
  children,
  ...props
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-medium leading-5",
        t.wrap,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot, pulse && "animate-status-beat")}
        />
      )}
      {children}
    </span>
  );
}
