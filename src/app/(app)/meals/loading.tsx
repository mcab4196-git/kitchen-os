import { Skeleton } from "@/components/ui/skeleton";

export default function MealsLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-14 w-full rounded-control" />
      <Skeleton className="mt-8 h-4 w-32" />
      <div className="mt-3 space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
