import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              {Array.from({ length: 3 }).map((__, j) => <Skeleton key={j} className="h-10 w-full" />)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
