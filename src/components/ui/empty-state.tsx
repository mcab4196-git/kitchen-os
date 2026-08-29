import * as React from "react";
import { Icon, type IconName } from "./icon";
import { cn } from "@/lib/utils";

/** One empty-state treatment across every screen. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in rounded-card border border-dashed border-line-strong bg-surface-2/60 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-muted">
          <Icon name={icon} size={20} />
        </div>
      )}
      <p className="font-display text-title-sm text-ink">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-[38ch] text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
