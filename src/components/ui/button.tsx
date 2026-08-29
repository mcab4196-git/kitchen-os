import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control " +
  "font-medium tracking-[-0.005em] transition duration-fast ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "active:translate-y-px active:scale-[0.985]";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-contrast shadow-xs hover:bg-brand-ink",
  secondary: "border border-line-strong bg-card text-ink hover:bg-surface-2 hover:border-line",
  ghost: "text-ink hover:bg-brand-soft",
  destructive: "border border-status-critical-border bg-status-critical-bg text-status-critical-fg hover:bg-status-critical/15",
  // Warm emphasis without white-on-amber: a filled tint that stays AA-legible.
  accent: "border border-accent/30 bg-accent-soft text-accent-fg hover:bg-accent/15",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/** Minimal Slot: merge our classes/props onto a single child element. */
function mergeChild(child: React.ReactElement, props: Record<string, unknown>) {
  const childProps = child.props as { className?: string };
  return React.cloneElement(child, {
    ...props,
    className: cn(childProps.className, props.className as string),
  } as never);
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & Common & { asChild?: boolean }
>(function Button(
  { variant = "primary", size = "md", loading = false, asChild = false, className, children, disabled, ...props },
  ref,
) {
  const classes = cn(base, variants[variant], sizes[size], loading && "text-transparent", className);

  const inner = (
    <>
      {children}
      {loading && (
        <span
          aria-hidden
          className="motion-keep absolute inset-0 m-auto h-4 w-4 animate-[spin_0.7s_linear_infinite] rounded-full border-2 border-current border-t-transparent opacity-70"
        />
      )}
    </>
  );

  if (asChild && React.isValidElement(children)) {
    return mergeChild(children as React.ReactElement, {
      className: classes,
      "data-loading": loading || undefined,
      ...props,
    });
  }

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {inner}
    </button>
  );
});
