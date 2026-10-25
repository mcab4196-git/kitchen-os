import { createClient } from "@/lib/supabase/server";
import { listShopping } from "@/server/services/shopping";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SubmitAction, SubmitButton } from "@/components/ui/feedback";
import { controlClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { addItemAction, clearCheckedAction } from "./actions";
import { ShoppingList } from "./shopping-list";

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
              <SubmitAction className="inline-flex h-11 items-center gap-1.5 rounded-control border border-line bg-card px-3 text-small font-medium text-muted hover:text-status-critical-fg">
                <Icon name="trash" size={15} />
                Clear {checkedCount}
              </SubmitAction>
            </form>
          ) : undefined
        }
      />

      <form action={addItemAction} className="mb-4 flex gap-2">
        <input name="label" required aria-label="Item to buy" placeholder="Add an item…" className={cn(controlClass, "flex-1")} />
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
        <ShoppingList items={items} />
      )}
    </main>
  );
}
