import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

/**
 * The single card treatment. `interactive` adds hover/press affordance; use
 * `asLink` / `href` for a whole-card link row (with a trailing chevron).
 */
export function Card({
  as: As = "div",
  interactive = false,
  inset = false,
  className,
  ...props
}: {
  as?: React.ElementType;
  interactive?: boolean;
  inset?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        "rounded-card border border-line bg-card text-ink shadow-card",
        inset ? "p-3.5" : "p-4",
        interactive &&
          "transition duration-fast ease-out hover:border-line-strong hover:shadow-pop active:translate-y-px active:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

/** A tappable list row that links somewhere, with a consistent trailing chevron. */
export function LinkRow({
  href,
  className,
  children,
  chevron = true,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  chevron?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-card border border-line bg-card p-3.5 text-ink shadow-card",
        "transition duration-fast ease-out hover:border-line-strong hover:shadow-pop active:translate-y-px active:shadow-card",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {chevron && (
        <Icon
          name="chevron-right"
          size={18}
          className="shrink-0 text-faint transition-transform duration-fast ease-out group-hover:translate-x-0.5 group-hover:text-muted"
        />
      )}
    </Link>
  );
}
