"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * A raised pill action fixed in the thumb zone, just above the mobile tab bar.
 * The header "Add" sits in the hardest-to-reach corner of a phone; this puts the
 * kitchen's primary action where a thumb already rests. Mobile only — desktop
 * keeps the SideNav "Scan receipt" button and per-screen header actions.
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
    <Link
      href={href}
      className="fixed right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-contrast shadow-pop transition duration-fast ease-out hover:bg-brand-ink active:scale-[0.97] lg:hidden"
      style={{ bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom) + 1.25rem)" }}
    >
      <Icon name={icon} size={20} strokeWidth={2} />
      {label}
    </Link>
  );
}
