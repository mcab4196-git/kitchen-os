import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-44" />
      </div>
      <Skeleton className="mb-5 h-[4.5rem] w-full rounded-card" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[4.75rem] rounded-card" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Skeleton className="h-14 rounded-control" />
        <Skeleton className="h-14 rounded-control" />
      </div>
      <Skeleton className="mt-8 h-4 w-28" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
