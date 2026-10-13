/** Faoliyat jurnali skeleti. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-48 max-w-full rounded-[var(--radius-m)]" />
          <div className="skeleton-shimmer h-4 w-64 max-w-full rounded" />
        </div>
        <div className="skeleton-shimmer h-10 w-36 rounded-[var(--radius-control)]" />
      </div>
      <div className="skeleton-shimmer mb-4 h-11 w-full rounded-[var(--radius-control)]" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-2)] p-4"
          >
            <div className="skeleton-shimmer size-10 shrink-0 rounded-[var(--radius-m)]" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-4 w-2/5 rounded" />
              <div className="skeleton-shimmer h-3 w-3/5 rounded" />
            </div>
            <div className="skeleton-shimmer h-6 w-20 rounded-[var(--radius-s)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
