import { toggleSavedAction } from "@/app/(app)/meals/actions";

/** A star toggle to save/unsave a recipe. Server-action form, no client JS. */
export function SaveToggle({ recipeId, saved, showLabel = false }: { recipeId: string; saved: boolean; showLabel?: boolean }) {
  return (
    <form action={toggleSavedAction}>
      <input type="hidden" name="recipeId" value={recipeId} />
      <button
        type="submit"
        aria-label={saved ? "Remove from saved" : "Save recipe"}
        title={saved ? "Saved — tap to remove" : "Save recipe"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          saved ? "border-accent bg-accent-soft text-accent" : "border-line bg-card text-muted hover:text-ink"
        }`}
      >
        <span aria-hidden>{saved ? "★" : "☆"}</span>
        {showLabel && (saved ? "Saved" : "Save")}
      </button>
    </form>
  );
}
