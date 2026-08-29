import { Skeleton } from "@/components/ui/skeleton";

export default function ShoppingLoading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-24" />
      <div className="mt-6 mb-4 flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-control" />
        <Skeleton className="h-11 w-20 rounded-control" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-11 w-full rounded-control" />
        ))}
      </div>
    </div>
  );
}
