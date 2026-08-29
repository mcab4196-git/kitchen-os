"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

/**
 * One header for every screen. Top-level tabs pass just a title (large). Sub-pages
 * pass `back` — a href, or `true` for history-aware back that falls back to a
 * sensible href when there's no history (deep link / refresh).
 */
export function PageHeader({
  title,
  subtitle,
  back,
  backFallback = "/dashboard",
  actions,
  size = "lg",
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: string | true;
  backFallback?: string;
  actions?: React.ReactNode;
  size?: "lg" | "md";
  className?: string;
}) {
  const router = useRouter();

  const backEl =
    back === true ? (
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) router.back();
          else router.push(backFallback);
        }}
        className="-ml-2 inline-flex h-9 items-center gap-1 rounded-control px-2 text-sm text-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon name="arrow-left" size={18} />
        Back
      </button>
    ) : back ? (
      <Link
        href={back}
        className="-ml-2 inline-flex h-9 items-center gap-1 rounded-control px-2 text-sm text-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon name="arrow-left" size={18} />
        Back
      </Link>
    ) : null;

  return (
    <header className={cn("mb-6", className)}>
      {backEl && <div className="mb-2">{backEl}</div>}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className={cn(
              "font-display text-ink text-balance",
              size === "lg" ? "text-title" : "text-title-sm",
            )}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-1 max-w-[42ch] text-[13.5px] leading-5 text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>}
      </div>
    </header>
  );
}
