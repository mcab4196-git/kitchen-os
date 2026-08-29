import { createClient } from "@/lib/supabase/server";
import { listShopping } from "@/server/services/shopping";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { SubmitAction, SubmitButton } from "@/components/ui/feedback";
import { controlClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { addItemAction, toggleCheckedAction, removeItemAction, clearCheckedAction } from "./actions";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { items } = await listShopping(user!.id);

  const checkedCount = items.filter((i) => i.checked).length;
  const remaining = items.length - checkedCount;

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Shopping"
        subtitle={
          items.length > 0
            ? `${remaining} to buy${checkedCount ? ` · ${checkedCount} done` : ""}`
            : undefined
        }
        actions={
          checkedCount > 0 ? (
            <form action={clearCheckedAction}>
              <SubmitAction className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-card px-3 text-[13px] font-medium text-muted hover:text-status-critical-fg">
                <Icon name="trash" size={15} />
                Clear {checkedCount}
              </SubmitAction>
            </form>
          ) : undefined
        }
      />

      <form action={addItemAction} className="mb-4 flex gap-2">
        <input name="label" required placeholder="Add an item…" className={cn(controlClass, "flex-1")} />
        <SubmitButton size="md" className="px-4">
          <Icon name="plus" size={16} />
          Add
        </SubmitButton>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon="cart"
          title="Your list is empty"
          description="Add items here, or send a recipe's missing ingredients over from its page."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className={cn(
                "flex items-center gap-3 rounded-control border border-line bg-card p-2.5 transition duration-fast ease-out",
                it.checked && "opacity-55",
              )}
            >
              <form action={toggleCheckedAction} className="flex">
                <input type="hidden" name="itemId" value={it.id} />
                <SubmitAction
                  aria-label={it.checked ? "Uncheck" : "Check off"}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition duration-fast ease-out",
                    it.checked
                      ? "border-brand bg-brand text-brand-contrast"
                      : "border-line-strong hover:border-brand",
                  )}
                >
                  {it.checked && <Icon name="check" size={14} strokeWidth={2.5} />}
                </SubmitAction>
              </form>

              <div className="min-w-0 flex-1">
                <span className={cn("text-[14px] text-ink tabular", it.checked && "line-through")}>
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

              <form action={removeItemAction} className="flex">
                <input type="hidden" name="itemId" value={it.id} />
                <SubmitAction
                  aria-label={`Remove ${it.label}`}
                  className="rounded-md p-1.5 text-faint hover:bg-status-critical-bg hover:text-status-critical-fg"
                >
                  <Icon name="x" size={15} />
                </SubmitAction>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
