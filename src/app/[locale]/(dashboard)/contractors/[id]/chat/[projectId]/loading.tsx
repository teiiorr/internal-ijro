/** Loyiha suhbati skeleti. */
export default function Loading() {
  return (
    <div className="flex h-[70vh] animate-pulse flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="skeleton-shimmer size-10 shrink-0 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton-shimmer h-4 w-40 rounded" />
          <div className="skeleton-shimmer h-3 w-24 rounded" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={i % 2 === 0 ? "self-start" : "self-end"}>
            <div className="skeleton-shimmer h-14 w-56 max-w-[70vw] rounded-[var(--radius-card)]" />
          </div>
        ))}
      </div>
      <div className="skeleton-shimmer mt-4 h-12 w-full rounded-[var(--radius-control)]" />
    </div>
  );
}
