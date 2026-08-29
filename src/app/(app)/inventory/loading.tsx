import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-10 w-24 rounded-control" />
      </div>
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-control" />
        <Skeleton className="h-11 w-24 rounded-control" />
      </div>
      <div className="mb-4 flex gap-2">
        {[14, 20, 16, 18, 16].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}
