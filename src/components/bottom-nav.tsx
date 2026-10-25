"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";

type NavItem = { href: string; label: string; icon: IconName; match: string[] };

const items: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home", match: ["/dashboard", "/alerts"] },
  { href: "/inventory", label: "Inventory", icon: "inventory", match: ["/inventory"] },
  { href: "/meals", label: "Cook", icon: "cook", match: ["/meals", "/plan"] },
  { href: "/shopping", label: "Shopping", icon: "cart", match: ["/shopping"] },
  { href: "/settings", label: "Settings", icon: "settings", match: ["/settings"] },
];

function useActive() {
  const pathname = usePathname();
  return (it: NavItem) => it.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

/** Fixed bottom tab bar — mobile / tablet. Safe-area aware. */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/85 shadow-nav backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-app items-stretch justify-between px-1">
        {items.map((it) => {
          const active = isActive(it);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 py-2 text-center text-2xs font-medium leading-tight transition-colors duration-fast",
                  active ? "text-brand" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full bg-brand transition-all duration-slow ease-out",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  name={it.icon}
                  size={22}
                  strokeWidth={active ? 2 : 1.75}
                  className="transition-transform duration-fast ease-out group-active:scale-90"
                />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Sticky sidebar — desktop (lg+). */
export function SideNav() {
  const isActive = useActive();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-line px-3 py-6 lg:flex">
      <Link href="/dashboard" className="mb-5 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-contrast">
          <Icon name="leaf" size={17} />
        </span>
        <span className="font-display text-[15px] font-semibold text-ink">Kitchen OS</span>
      </Link>

      <Link
        href="/scan"
        className="mb-3 flex items-center gap-2 rounded-control bg-brand px-3 py-2.5 text-sm font-medium text-brand-contrast shadow-xs transition duration-fast ease-out hover:bg-brand-ink active:scale-[0.98]"
      >
        <Icon name="scan" size={18} />
        Scan receipt
      </Link>

      {items.map((it) => {
        const active = isActive(it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors duration-fast",
              active ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon name={it.icon} size={19} strokeWidth={active ? 2 : 1.75} />
            {it.label}
          </Link>
        );
      })}

      <Link
        href="/receipts"
        className="mt-auto flex items-center gap-3 rounded-control px-3 py-2 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <Icon name="clock" size={17} />
        Receipt history
      </Link>
    </aside>
  );
}
