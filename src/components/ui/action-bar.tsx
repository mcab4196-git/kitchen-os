import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The sticky bar that holds a screen's main action (Save, Add to inventory, Cook &
 * deduct). On phones it rides just above the tab bar while there's more to scroll,
 * then settles after the content, so it never covers the end of a form; on desktop
 * it's a rounded card at the foot of the column. One component, so the screens that
 * use it can't drift (PLAN 5.7).
 */
export function ActionBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+0.75rem)] z-10 -mx-4 border-t border-line bg-surface/85 px-4 py-3 backdrop-blur-md",
        "lg:bottom-4 lg:mx-0 lg:rounded-card lg:border",
        className,
      )}
    >
      {children}
    </div>
  );
}
