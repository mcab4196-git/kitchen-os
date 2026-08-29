import { Skeleton } from "@/components/ui/skeleton";

export default function PlanLoading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="mb-2 h-9 w-16" />
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-5 flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-control" />
        <Skeleton className="h-12 flex-1 rounded-control" />
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-16 w-12 shrink-0 rounded-control" />
            <Skeleton className="h-16 flex-1 rounded-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
