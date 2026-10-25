"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

/* ─────────────────────────── shared overlay shell ───────────────────────────
   Dependency-free. Scrim + focus trap + ESC + body-scroll-lock + focus restore.
   `Sheet` slides up from the bottom edge (origin-aware); `Dialog` scales in from
   96%. Both fall back to a plain opacity fade under `prefers-reduced-motion`. */

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);

    // Focus the first control (or the panel) once painted.
    const raf = requestAnimationFrame(() => {
      const list = focusables();
      (list[0] ?? panelRef.current)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  return panelRef;
}

/** Keeps the exit animation on screen for ~200ms after `open` flips to false. */
function usePresence(open: boolean) {
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  return { mounted, visible };
}

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, title, description, children, className }: BaseProps) {
  const { mounted, visible } = usePresence(open);
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const panelRef = useOverlay(mounted, close);
  const [portal, setPortal] = React.useState(false);
  React.useEffect(() => setPortal(true), []);

  if (!mounted || !portal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="presentation">
      <div
        onClick={close}
        className={cn(
          "absolute inset-0 bg-ink/40 transition-opacity duration-slow ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative flex w-full max-w-app flex-col rounded-t-2xl border border-line bg-card shadow-pop outline-none",
          "max-h-[88dvh] pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[85dvh] sm:rounded-2xl",
          "transition duration-slow ease-out motion-reduce:transition-opacity",
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 sm:translate-y-2",
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0">
            <h2 className="font-display text-title-sm text-ink">{title}</h2>
            {description && <p className="mt-1 text-small leading-5 text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-1.5 -mt-0.5 shrink-0 rounded-full p-1.5 text-faint transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Dialog({ open, onOpenChange, title, description, children, className }: BaseProps) {
  const { mounted, visible } = usePresence(open);
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const panelRef = useOverlay(mounted, close);
  const [portal, setPortal] = React.useState(false);
  React.useEffect(() => setPortal(true), []);

  if (!mounted || !portal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <div
        onClick={close}
        className={cn(
          "absolute inset-0 bg-ink/40 transition-opacity duration-fast ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-sm rounded-card border border-line bg-card p-5 shadow-pop outline-none",
          "transition duration-fast ease-out motion-reduce:transition-opacity",
          visible ? "scale-100 opacity-100" : "scale-[0.96] opacity-0",
          className,
        )}
      >
        <h2 className="font-display text-title-sm text-ink">{title}</h2>
        {description && <p className="mt-1.5 text-[0.84375rem] leading-5 text-muted">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
