import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * The header shared by sign-in and sign-up: the wordmark beside the logo (not an
 * eyebrow above the heading, PLAN 5.6), the heading, one line under it, and for the
 * two-step sign-up a quiet progress bar that the subtitle's "Step 1 of 2" carries.
 */
export function AuthHeader({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle: React.ReactNode;
  step?: { current: number; total: number };
}) {
  return (
    <header className="mb-8">
      <span className="mb-6 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-control bg-brand text-brand-contrast">
          <Icon name="leaf" size={20} />
        </span>
        <span className="font-display text-title-sm text-ink">Kitchen OS</span>
      </span>
      {step && (
        <span aria-hidden className="mb-5 flex gap-1.5">
          {Array.from({ length: step.total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-slow",
                i < step.current ? "bg-brand" : "bg-line",
              )}
            />
          ))}
        </span>
      )}
      <h1 className="font-display text-title-lg leading-tight text-ink text-balance">{title}</h1>
      <p className="mt-3 text-pretty text-sm leading-6 text-muted">{subtitle}</p>
    </header>
  );
}
