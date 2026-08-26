import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-ink",
  accent: "bg-accent text-white hover:brightness-95",
  ghost: "bg-transparent text-ink hover:bg-brand-soft",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
