import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Sarlavha qatori: orqaga + sarlavha */}
      <div className="mb-5 flex items-start gap-2 sm:mb-6">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <Skeleton className="mt-1 h-7 w-3/5" />
      </div>
      <div className="flex flex-col gap-8 lg:gap-12">
        {/* Metadata qatori */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
        {/* Oʻqish ustuni */}
        <div className="max-w-[var(--measure)] space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={i % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
          ))}
        </div>
      </div>
    </div>
  );
}
