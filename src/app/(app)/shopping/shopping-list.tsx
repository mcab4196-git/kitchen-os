"use client";

import { useEffect, useRef, useState } from "react";
import { toggleCheckedAction, removeItemAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/section-label";

export interface ShoppingItem {
  id: string;
  label: string;
  quantityNeeded: number | null;
  unit: string | null;
  reason: string;
  checked: boolean;
}

// Presentation-only aisle guess from the item text. No category data on the
// model yet, so anything unmatched lands in "Other".
const AISLES: [string, RegExp][] = [
  ["Produce", /\b(apple|banana|lemon|lime|orange|potato|onion|garlic|carrot|tomato|spinach|lettuce|salad|pepper|cucumber|broccoli|mushroom|herb|parsley|coriander|basil|avocado|berry|berries|fruit|veg|kale|courgette|aubergine|ginger)\b/i],
  ["Meat & fish", /\b(chicken|beef|pork|lamb|mince|bacon|sausage|fish|salmon|tuna|prawn|shrimp|turkey|ham|steak)\b/i],
  ["Chilled & dairy", /\b(milk|cheese|butter|yoghurt|yogurt|cream|egg|eggs|margarine|feta|halloumi)\b/i],
  ["Bakery", /\b(bread|roll|bagel|croissant|bun|tortilla|wrap|pitta|baguette|naan)\b/i],
  ["Store cupboard", /\b(rice|pasta|noodle|flour|sugar|oil|vinegar|salt|spice|cumin|paprika|stock|beans|lentil|chickpea|tin|can|jar|sauce|cereal|oat|honey|coffee|tea)\b/i],
  ["Frozen", /\b(frozen|ice cream|peas|fish fingers)\b/i],
];

function aisleFor(label: string): string {
  for (const [name, re] of AISLES) if (re.test(label)) return name;
  return "Other";
}

const GROUP_ORDER = [...AISLES.map(([n]) => n), "Other"];
const UNDO_MS = 5000;

type Toast = { id: string; message: string; onUndo: () => void };

export function ShoppingList({ items: serverItems }: { items: ShoppingItem[] }) {
  const [pendingChecked, setPendingChecked] = useState<Map<string, boolean>>(new Map());
  const [pendingRemoved, setPendingRemoved] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  // Once the server revalidation lands, drop optimistic overrides it has caught
  // up with (or that refer to an item it no longer has).
  useEffect(() => {
    const ids = new Set(serverItems.map((i) => i.id));
    setPendingRemoved((s) => {
      let changed = false;
      const n = new Set<string>();
      s.forEach((id) => (ids.has(id) ? n.add(id) : (changed = true)));
      return changed ? n : s;
    });
    setPendingChecked((m) => {
      let changed = false;
      const n = new Map<string, boolean>();
      m.forEach((v, id) => {
        const srv = serverItems.find((i) => i.id === id);
        if (srv && srv.checked !== v) n.set(id, v);
        else changed = true;
      });
      return changed ? n : m;
    });
  }, [serverItems]);

  function clearTimer(id: string) {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }

  function dropToast(id: string) {
    setToasts((ts) => ts.filter((x) => x.id !== id));
  }

  function schedule(id: string, commit: () => void) {
    clearTimer(id);
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        dropToast(id);
        commit();
      }, UNDO_MS),
    );
  }

  function showToast(id: string, message: string, onUndo: () => void) {
    setToasts((ts) => [...ts.filter((x) => x.id !== id), { id, message, onUndo }]);
  }

  function toggle(item: ShoppingItem) {
    const current = pendingChecked.get(item.id) ?? item.checked;
    const next = !current;
    setPendingChecked((m) => new Map(m).set(item.id, next));
    showToast(
      item.id,
      next ? `“${item.label}” checked off` : `“${item.label}” back on the list`,
      () => {
        clearTimer(item.id);
        dropToast(item.id);
        setPendingChecked((m) => {
          const n = new Map(m);
          n.delete(item.id);
          return n;
        });
      },
    );
    schedule(item.id, () => {
      const fd = new FormData();
      fd.set("itemId", item.id);
      void toggleCheckedAction(fd).then(() =>
        setPendingChecked((m) => {
          const n = new Map(m);
          n.delete(item.id);
          return n;
        }),
      );
    });
  }

  function remove(item: ShoppingItem) {
    setPendingRemoved((s) => new Set(s).add(item.id));
    showToast(item.id, `“${item.label}” removed`, () => {
      clearTimer(item.id);
      dropToast(item.id);
      setPendingRemoved((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
    });
    schedule(item.id, () => {
      const fd = new FormData();
      fd.set("itemId", item.id);
      void removeItemAction(fd);
    });
  }

  const view = serverItems
    .filter((i) => !pendingRemoved.has(i.id))
    .map((i) => (pendingChecked.has(i.id) ? { ...i, checked: pendingChecked.get(i.id)! } : i));

  const groups = GROUP_ORDER.map((name) => ({
    name,
    rows: view.filter((i) => aisleFor(i.label) === name),
  })).filter((g) => g.rows.length > 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.name}>
            <SectionLabel className="mb-2">
              {g.name} · {g.rows.length}
            </SectionLabel>
            <ul className="flex flex-col gap-2">
              {g.rows.map((it) => (
                <li
                  key={it.id}
                  className={cn(
                    "flex items-center gap-2 rounded-control border border-line bg-card pl-1 pr-1 transition duration-fast ease-out",
                    it.checked && "opacity-55",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(it)}
                    aria-pressed={it.checked}
                    aria-label={it.checked ? `Uncheck ${it.label}` : `Check off ${it.label}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md border transition duration-fast ease-out",
                        it.checked
                          ? "border-brand bg-brand text-brand-contrast"
                          : "border-line-strong",
                      )}
                    >
                      {it.checked && <Icon name="check" size={14} strokeWidth={2.5} />}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1 py-2">
                    <span className={cn("text-compact text-ink tabular", it.checked && "line-through")}>
                      {it.quantityNeeded ? `${it.quantityNeeded} ` : ""}
                      {it.unit ? `${it.unit} ` : ""}
                      {it.label}
                    </span>
                    {it.reason === "RECIPE" && (
                      <Badge tone="brand" className="ml-2 align-middle">
                        recipe
                      </Badge>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(it)}
                    aria-label={`Remove ${it.label}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-faint transition-colors duration-fast hover:bg-status-critical-bg hover:text-status-critical-fg"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {toasts.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 z-50 mx-auto flex max-w-app flex-col items-center gap-2 px-4"
          style={{ bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom) + 1rem)" }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full items-center gap-3 rounded-control bg-ink px-3.5 py-2.5 text-small text-card shadow-pop animate-toast-in"
            >
              <span className="min-w-0 flex-1">{t.message}</span>
              <button
                type="button"
                onClick={t.onUndo}
                className="-my-1.5 min-h-11 shrink-0 rounded-md bg-card/15 px-3 text-small font-semibold text-card"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
