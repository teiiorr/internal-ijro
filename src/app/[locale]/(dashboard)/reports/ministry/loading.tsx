/** Ministrlik hisoboti skeleti: sarlavha + davr tanlagich, 4 ta plitka, ikki jadval. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-72 max-w-full rounded-[var(--radius-m)]" />
          <div className="skeleton-shimmer h-4 w-40 rounded" />
        </div>
        <div className="skeleton-shimmer h-10 w-full rounded-[var(--radius-control)] sm:w-[220px]" />
      </div>

      <div className="flex flex-col gap-8 lg:gap-12">
        <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton-shimmer h-7 w-1/2 rounded" />
                <div className="skeleton-shimmer h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>

        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton-shimmer h-5 w-40 rounded" />
            <div className="skeleton-shimmer h-48 w-full rounded-[var(--radius-card)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
