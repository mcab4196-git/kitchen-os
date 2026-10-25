"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/** Informational spinner — keeps turning under `prefers-reduced-motion`. */
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={cn(
        "motion-keep inline-block animate-[spin_0.7s_linear_infinite] rounded-full border-2 border-line border-t-brand",
        className,
      )}
    />
  );
}

/** Indeterminate progress bar for genuinely slow, multi-stage work (AI calls). */
export function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label="Working"
      className={cn("h-1 w-full overflow-hidden rounded-full bg-line/70", className)}
    >
      <div className="motion-keep h-full w-1/2 rounded-full bg-brand animate-indeterminate" />
    </div>
  );
}

/**
 * Submit button for plain server-action forms (no `useActionState`). Shows a
 * pending state via `useFormStatus`, so every mutation acknowledges immediately.
 */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

/** A bare icon/text submit control (used inside list rows) with a pending dim. */
export function SubmitAction({
  children,
  className,
  pendingClassName = "opacity-40",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingClassName?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-busy={pending || undefined}
      className={cn(
        "transition duration-fast ease-out active:scale-95 disabled:cursor-progress",
        pending && pendingClassName,
        className,
      )}
      disabled={pending}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * The one inline error box: Critical tint, announced as it appears. Shared so the
 * forms that show it can't drift apart (PLAN 5.7).
 */
export function FormError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-small text-status-critical-fg",
        className,
      )}
    >
      {children}
    </p>
  );
}
