import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui-biib/Card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-full sm:w-44" />
      </div>
      <div className="flex flex-col gap-8">
        {/* Yetakchi eʼlon */}
        <div className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        {/* Ixcham qatorlar */}
        <Card bare className="px-5 sm:px-6">
          <ul className="-my-1 divide-y divide-[var(--line)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="-mx-5 flex items-center gap-3 px-5 py-3 sm:-mx-6 sm:px-6">
                <Skeleton className="size-2 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
