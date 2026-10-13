/** Xodim sahifasi skeleti. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 flex items-start gap-3 sm:mb-6">
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-8 w-3/5 max-w-full rounded-[var(--radius-m)]" />
          <div className="flex gap-2">
            <div className="skeleton-shimmer h-5 w-20 rounded-[var(--radius-s)]" />
            <div className="skeleton-shimmer h-5 w-16 rounded-[var(--radius-s)]" />
          </div>
        </div>
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton-shimmer h-3 w-16 rounded" />
              <div className="skeleton-shimmer h-5 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-16 w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
