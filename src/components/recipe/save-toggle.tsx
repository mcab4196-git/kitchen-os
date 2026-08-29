"use client";

import { useOptimistic, useTransition } from "react";
import { toggleSavedAction } from "@/app/(app)/meals/actions";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** Star toggle to save / unsave a recipe. Flips instantly, reconciles on the server. */
export function SaveToggle({
  recipeId,
  saved,
  showLabel = false,
}: {
  recipeId: string;
  saved: boolean;
  showLabel?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleSavedAction(fd);
        });
      }}
    >
      <input type="hidden" name="recipeId" value={recipeId} />
      <button
        type="submit"
        aria-pressed={optimistic}
        aria-label={optimistic ? "Remove from saved" : "Save recipe"}
        title={optimistic ? "Saved — tap to remove" : "Save recipe"}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-medium transition duration-fast ease-out active:scale-90",
          optimistic
            ? "border-accent/30 bg-accent-soft text-accent-fg"
            : "border-line bg-card text-faint hover:border-line-strong hover:text-muted",
        )}
      >
        <Icon
          name={optimistic ? "star-filled" : "star"}
          size={15}
          className={cn("transition-transform duration-fast", optimistic && "scale-110")}
        />
        {showLabel && (optimistic ? "Saved" : "Save")}
      </button>
    </form>
  );
}
