/** Haftalik brifing skeleti: sarlavha + hafta tanlagich, 7 ta KPI, ikki ustun, grafik, xulosa. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-64 max-w-full rounded-lg" />
          <div className="skeleton-shimmer h-4 w-48 rounded" />
        </div>
        <div className="skeleton-shimmer h-11 w-full rounded-2xl sm:w-[350px]" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 ${i === 6 ? "col-span-2 sm:col-span-3 lg:col-span-1" : ""}`}
          >
            <div className="skeleton-shimmer h-3 w-3/4 rounded" />
            <div className="skeleton-shimmer h-7 w-1/2 rounded" />
            <div className="skeleton-shimmer h-7 w-full rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6">
            <div className="flex items-center gap-2.5">
              <div className="skeleton-shimmer size-9 rounded-xl" />
              <div className="skeleton-shimmer h-5 w-40 rounded" />
            </div>
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="skeleton-shimmer h-16 rounded-xl" />
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6">
        <div className="skeleton-shimmer h-5 w-40 rounded" />
        <div className="skeleton-shimmer h-[240px] w-full rounded-xl" />
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6">
        <div className="skeleton-shimmer h-5 w-32 rounded" />
        <div className="skeleton-shimmer h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
