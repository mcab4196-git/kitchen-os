"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useTransition, useRef } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { controlClass } from "@/components/ui/field";

const FILTERS: [string, string][] = [
  ["all", "All"],
  ["soon", "Use soon"],
  ["expired", "Expired"],
  ["fridge", "Fridge"],
  ["freezer", "Freezer"],
  ["pantry", "Pantry"],
  ["cupboard", "Cupboard"],
];

/**
 * `counts` is passed only when the full live set is on screen (no search, no
 * active filter) so a chip's number is never a lie about a filtered subset.
 */
export function InventoryControls({ counts }: { counts?: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const stripRef = useRef<HTMLDivElement>(null);

  const activeFilter = params.get("filter") ?? "all";
  const sort = params.get("sort") ?? "expiry";
  const [q, setQ] = useState(params.get("q") ?? "");

  // Debounce search input into the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      startTransition(() => router.replace(`${pathname}?${next.toString()}`));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Keep the active chip in view when it changes (e.g. deep-linked filter).
  // Scroll the strip itself — `scrollIntoView` on a horizontal strip can also
  // scroll the whole page up/down.
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>('[data-active="true"]');
    if (!strip || !active) return;
    const left = active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeFilter]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && !(key === "filter" && value === "all")) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className={cn("mb-4 flex flex-col gap-3 transition-opacity", isPending && "opacity-60")}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items…"
            className={cn(controlClass, "pl-9")}
            aria-label="Search inventory"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className={cn(controlClass, "w-auto min-w-[6.5rem]")}
          aria-label="Sort inventory"
        >
          <option value="expiry">By expiry</option>
          <option value="name">By name</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      <div
        ref={stripRef}
        className="no-scrollbar edge-fade-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:-mx-1 lg:px-1"
      >
        {FILTERS.map(([value, label]) => {
          const active = activeFilter === value;
          const count = counts?.[value];
          return (
            <button
              key={value}
              data-active={active}
              onClick={() => setParam("filter", value)}
              className={cn(
                "inline-flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition duration-fast ease-out active:scale-95",
                active
                  ? "border-brand bg-brand text-brand-contrast shadow-xs"
                  : "border-line bg-card text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {label}
              {count != null && (
                <span className={cn("tabular", active ? "text-brand-contrast/75" : "text-faint")}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
