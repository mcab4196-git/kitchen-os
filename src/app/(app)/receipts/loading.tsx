import { Skeleton } from "@/components/ui/skeleton";

export default function ReceiptsLoading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="mb-2 h-9 w-16" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-20 rounded-control" />
      </div>
      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[4.25rem] w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
