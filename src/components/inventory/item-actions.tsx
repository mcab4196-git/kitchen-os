"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteItem } from "@/app/(app)/inventory/actions";
import { ConsumeFields } from "@/app/(app)/inventory/[id]/use/consume-fields";
import { Sheet, Dialog } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

/** Card action row: quick-use opens a sheet, remove asks first. Both keep a
 *  full-page fallback (the /use and /edit routes still work on their own). */
export function ItemActions({
  id,
  productName,
  quantity,
  unit,
  storageLabel,
}: {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  storageLabel?: string;
}) {
  const [useOpen, setUseOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mt-3.5 flex items-center gap-1 border-t border-line pt-1 text-small">
      <button
        type="button"
        onClick={() => setUseOpen(true)}
        className="inline-flex h-11 items-center gap-1.5 rounded-control px-2.5 font-medium text-brand transition-colors duration-fast hover:bg-brand-soft active:scale-95"
      >
        <Icon name="minus" size={15} />
        Use
      </button>
      <Link
        href={`/inventory/${id}/edit`}
        className="inline-flex h-11 items-center gap-1.5 rounded-control px-2.5 text-muted transition-colors duration-fast hover:bg-surface-2 hover:text-ink active:scale-95"
      >
        <Icon name="pencil" size={15} />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Remove ${productName}`}
        className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-control px-2.5 text-muted transition-colors duration-fast hover:bg-status-critical-bg hover:text-status-critical-fg active:scale-95"
      >
        <Icon name="trash" size={15} />
        Remove
      </button>

      <Sheet
        open={useOpen}
        onOpenChange={setUseOpen}
        title={`Use some ${productName.toLowerCase()}`}
        description={`In stock: ${quantity} ${unit}`}
      >
        <ConsumeFields
          id={id}
          currentQuantity={quantity}
          unit={unit}
          storageLabel={storageLabel}
          onCancel={() => setUseOpen(false)}
          autoFocus
        />
      </Sheet>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this item?"
        description={`“${productName}” will be taken off your inventory. You can undo straight after.`}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <form action={deleteItem}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton variant="destructive" pendingText="Removing…">
              Remove
            </SubmitButton>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
