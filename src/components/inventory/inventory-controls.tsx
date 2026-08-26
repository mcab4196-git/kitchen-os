"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { cn } from "@/lib/utils";

const FILTERS: [string, string][] = [
  ["all", "All"],
  ["soon", "Use soon"],
  ["expired", "Expired"],
  ["fridge", "Fridge"],
  ["freezer", "Freezer"],
  ["pantry", "Pantry"],
  ["cupboard", "Cupboard"],
];

export function InventoryControls() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

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

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && !(key === "filter" && value === "all")) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search items…"
          className="h-11 flex-1 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          aria-label="Search inventory"
        />
        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="h-11 rounded-xl border border-line bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-brand"
          aria-label="Sort"
        >
          <option value="expiry">Expiry</option>
          <option value="name">Name</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setParam("filter", value)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === value
                ? "border-brand bg-brand text-white"
                : "border-line bg-card text-muted hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
