"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { restoreItem } from "@/app/(app)/inventory/actions";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

type ToastTone = "success" | "info";
type Toast = { id: string; tone: ToastTone; message: string; undoId?: string };

const AUTO_DISMISS_MS = 4600;

/**
 * Confirmation toasts driven by the URL params the server actions already
 * redirect with (`?added`, `?cooked`, `?planned`, `?recalculated`, `?generated`,
 * `?undo`, `?dup`). On mount we read them, show a toast, and strip them from the
 * URL so a refresh or back-nav doesn't resurrect a stale banner. Mounted once in
 * the app shell.
 */
export function Toaster() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  React.useEffect(() => {
    const next: Toast[] = [];
    const consumed: string[] = [];
    const n = (key: string) => Number(params.get(key));
    const plural = (v: number) => (v === 1 ? "" : "s");

    if (params.has("added")) {
      const v = n("added");
      consumed.push("added");
      next.push({
        id: "added",
        tone: "success",
        message: pathname.startsWith("/shopping")
          ? `Added ${v} item${plural(v)} from the recipe.`
          : `Added ${v} item${plural(v)} to your inventory.`,
      });
    }
    if (params.has("cooked")) {
      const v = n("cooked");
      consumed.push("cooked");
      next.push({ id: "cooked", tone: "success", message: `Cooked — updated ${v} ingredient${plural(v)}.` });
    }
    if (params.has("planned")) {
      const v = n("planned");
      consumed.push("planned");
      next.push({ id: "planned", tone: "success", message: `Planned ${v} day${plural(v)}.` });
    }
    if (params.has("recalculated")) {
      const v = n("recalculated");
      consumed.push("recalculated");
      next.push({ id: "recalculated", tone: "success", message: `Recalculated expiry for ${v} item${plural(v)}.` });
    }
    if (params.has("generated")) {
      consumed.push("generated");
      next.push({ id: "generated", tone: "success", message: "Fresh dinner ideas are ready." });
    }
    if (params.has("saved")) {
      consumed.push("saved");
      next.push({ id: "saved", tone: "success", message: "Preferences saved." });
    }
    if (params.has("dup")) {
      consumed.push("dup");
      next.push({
        id: "dup",
        tone: "info",
        message: "You've scanned this receipt before — showing the saved extraction.",
      });
    }
    if (params.has("undo")) {
      const id = params.get("undo")!;
      consumed.push("undo");
      next.push({ id: "undo", tone: "info", message: "Item removed.", undoId: id });
    }

    if (next.length === 0) return;
    setToasts((cur) => [...cur.filter((c) => !next.some((x) => x.id === c.id)), ...next]);

    // Strip the consumed params, keep everything else.
    const sp = new URLSearchParams(params.toString());
    for (const k of consumed) sp.delete(k);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    const timers = next
      .filter((t) => !t.undoId)
      .map((t) => setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, pathname]);

  // Persistent live region: always in the DOM so PRs 3–5 (quantity, check-off,
  // undo) can announce through a stable node even before the first toast renders.
  const announcement = toasts[toasts.length - 1]?.message ?? "";

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>

      {toasts.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-app flex-col items-center gap-2 px-4"
          style={{ bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex w-full items-center gap-2.5 rounded-control border px-3.5 py-2.5 text-[13px] shadow-pop animate-toast-in",
                t.tone === "success"
                  ? "border-status-fresh-border bg-status-fresh-bg text-status-fresh-fg"
                  : "border-line-strong bg-card text-ink",
              )}
            >
              <Icon
                name={t.tone === "success" ? "check" : "sparkles"}
                size={16}
                className="shrink-0"
              />
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.undoId && (
                <form action={restoreItem}>
                  <input type="hidden" name="id" value={t.undoId} />
                  <button
                    type="submit"
                    className="rounded px-2 py-0.5 text-[13px] font-semibold text-brand underline underline-offset-2 hover:no-underline"
                  >
                    Undo
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
