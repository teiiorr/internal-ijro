/** Egasi paneli skeleti: koʻrsatkichlar va bloklar. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 space-y-2 sm:mb-6">
        <div className="skeleton-shimmer h-8 w-64 max-w-full rounded-[var(--radius-m)]" />
        <div className="skeleton-shimmer h-4 w-48 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-2)] p-5"
          >
            <div className="skeleton-shimmer h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-8 w-20 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-56 w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
