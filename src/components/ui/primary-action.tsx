"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * A raised pill action in the thumb zone, just above the mobile tab bar.
 * A header action sits in the hardest-to-reach corner of a phone; this puts the
 * screen's primary action where a thumb already rests: Scan receipt on Today, Add
 * on Inventory (PLAN 5.4). Mobile only — desktop
 * keeps the SideNav "Scan receipt" button and per-screen header actions.
 *
 * Sticky, not fixed [5.9]: it floats while there's more page below, then settles
 * under the last item, so it never covers the end of a list. Render it as the last
 * child of the page's <main>. Its offset matches the shell's bottom padding, so it
 * settles without a jump.
 *
 * Reference [1c] / [1d]; rationale [1n]A.
 */
export function PrimaryAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: IconName;
}) {
  return (
    // The full-width strip lets taps through; only the pill is clickable.
    <div
      className="pointer-events-none sticky z-30 mt-6 flex justify-end lg:hidden"
      style={{ bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom) + 1.5rem)" }}
    >
      <Link
        href={href}
        className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-contrast shadow-pop transition duration-fast ease-out hover:bg-brand-ink active:scale-[0.97]"
      >
        <Icon name={icon} size={20} strokeWidth={2} />
        {label}
      </Link>
    </div>
  );
}
