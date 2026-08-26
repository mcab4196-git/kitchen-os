"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: "M3 11l9-8 9 8M5 10v10h14V10" },
  { href: "/inventory", label: "Inventory", icon: "M4 7h16M4 12h16M4 17h16" },
  { href: "/meals", label: "Meals", icon: "M6 3v18M18 3v18M3 8h18" },
  { href: "/shopping", label: "Shopping", icon: "M6 6h15l-1.5 9h-12zM6 6L5 3H2" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-app items-stretch justify-between px-2">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                  active ? "text-brand" : "text-muted"
                )}
                aria-current={active ? "page" : undefined}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={it.icon} />
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
