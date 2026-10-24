"use client";

import { useState } from "react";
import { deleteReceiptAction } from "./actions";
import { Dialog } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

/** Delete asks first, like Remove on inventory. There's no undo: the photo is erased for good. */
export function DeleteReceipt({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete receipt: ${label}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:bg-status-critical-bg hover:text-status-critical-fg active:scale-95"
      >
        <Icon name="trash" size={18} />
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this receipt?"
        description="The photo and its scanned lines are deleted for good. Items you already added to your inventory stay."
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={deleteReceiptAction}>
            <input type="hidden" name="receiptId" value={id} />
            <SubmitButton variant="destructive" pendingText="Deleting…">
              Delete
            </SubmitButton>
          </form>
        </div>
      </Dialog>
    </>
  );
}
