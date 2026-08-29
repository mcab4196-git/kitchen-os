import { Skeleton } from "@/components/ui/skeleton";

export default function RecipeLoading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="mb-2 h-9 w-16" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-3 h-3.5 w-40" />

      <Skeleton className="mt-7 h-5 w-28" />
      <Skeleton className="mt-3 h-40 w-full rounded-card" />

      <Skeleton className="mt-7 h-5 w-20" />
      <div className="mt-3 space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
