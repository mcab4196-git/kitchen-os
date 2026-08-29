import { Skeleton } from "@/components/ui/skeleton";

export default function ScanLoading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="mb-2 h-9 w-16" />
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-5 h-60 w-full rounded-card" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-2/3" />
      <Skeleton className="mt-4 h-12 w-full rounded-control" />
    </div>
  );
}
