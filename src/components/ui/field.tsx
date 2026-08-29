import * as React from "react";
import { cn } from "@/lib/utils";

/** One shared control surface. Height 44px (comfortable touch target). */
export const controlClass =
  "h-11 w-full rounded-control border border-line-strong bg-card px-3 text-sm text-ink " +
  "placeholder:text-faint transition duration-fast ease-out " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 " +
  "disabled:opacity-50";

const selectClass = cn(
  controlClass,
  "appearance-none bg-[length:1.1rem] bg-[right_0.6rem_center] bg-no-repeat pr-9",
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 fill=%22none%22 stroke=%22%236a6a62%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClass, className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(selectClass, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlClass, "h-auto min-h-[5rem] py-2.5", className)} {...props} />;
  },
);

/** Label + optional hint + optional error, wrapping any control. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-2xs text-status-critical-fg">
          {error}
        </span>
      ) : (
        hint && <span className="text-2xs leading-4 text-muted">{hint}</span>
      )}
    </div>
  );
}

/** Styled checkbox that inherits the brand colour. */
export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "h-[18px] w-[18px] shrink-0 rounded-[5px] border-line-strong text-brand accent-brand",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          className,
        )}
        {...props}
      />
    );
  },
);
