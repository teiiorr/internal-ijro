/** Haftalik brifing skeleti: sarlavha + hafta tanlagich, koʻrsatkichlar kartasi, ikki ustun, grafik, xulosa. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-64 max-w-full rounded-[var(--radius-m)]" />
          <div className="skeleton-shimmer h-4 w-48 rounded" />
        </div>
        <div className="skeleton-shimmer h-11 w-full rounded-[var(--radius-control)] sm:w-[350px]" />
      </div>

      <div className="flex flex-col gap-8 lg:gap-12">
        <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton-shimmer h-7 w-1/2 rounded" />
                <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                <div className="skeleton-shimmer h-6 w-full rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton-shimmer h-5 w-40 rounded" />
              <div className="skeleton-shimmer h-48 w-full rounded-[var(--radius-card)]" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="skeleton-shimmer h-5 w-40 rounded" />
          <div className="skeleton-shimmer h-[280px] w-full rounded-[var(--radius-card)]" />
        </div>

        <div className="space-y-3">
          <div className="skeleton-shimmer h-5 w-32 rounded" />
          <div className="skeleton-shimmer h-40 w-full rounded-[var(--radius-card)]" />
        </div>
      </div>
    </div>
  );
}
