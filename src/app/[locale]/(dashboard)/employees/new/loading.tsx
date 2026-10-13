/** Yangi xodim shakli skeleti. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 space-y-2 sm:mb-6">
        <div className="skeleton-shimmer h-8 w-56 max-w-full rounded-[var(--radius-m)]" />
        <div className="skeleton-shimmer h-4 w-72 max-w-full rounded" />
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton-shimmer h-3 w-28 rounded" />
              <div className="skeleton-shimmer h-11 w-full rounded-[var(--radius-control)]" />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <div className="skeleton-shimmer h-10 w-24 rounded-[var(--radius-control)]" />
            <div className="skeleton-shimmer h-10 w-32 rounded-[var(--radius-control)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
