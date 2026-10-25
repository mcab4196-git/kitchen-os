"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteItem } from "@/app/(app)/inventory/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { SubmitButton } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { ConsumeFields } from "./consume-fields";

export function ConsumeForm({
  id,
  productName,
  currentQuantity,
  unit,
  storageLabel,
}: {
  id: string;
  productName: string;
  currentQuantity: number;
  unit: string;
  storageLabel?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Use item"
        back="/inventory"
        size="md"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/inventory/${id}/edit`}>
              <Icon name="pencil" size={15} />
              Edit
            </Link>
          </Button>
        }
      />

      <div className="mb-5 rounded-card border border-line bg-card p-4 shadow-card">
        <p className="text-body font-semibold text-ink">{productName}</p>
        <p className="mt-0.5 text-small text-muted tabular">
          In stock: {currentQuantity} {unit}
        </p>
      </div>

      <ConsumeFields
        id={id}
        currentQuantity={currentQuantity}
        unit={unit}
        storageLabel={storageLabel}
      />

      <div className="mt-6 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2.5 text-small text-muted transition-colors duration-fast hover:bg-status-critical-bg hover:text-status-critical-fg active:scale-95"
        >
          <Icon name="trash" size={15} />
          Remove this item
        </button>
      </div>

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
    </main>
  );
}
