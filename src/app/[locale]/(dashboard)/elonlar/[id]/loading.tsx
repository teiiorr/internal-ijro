import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Skeleton className="size-11 rounded-full" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-4/5" />
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Card className="space-y-3 p-5 sm:p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={i % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </Card>
    </div>
  );
}
