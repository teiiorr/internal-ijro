/** Xronologiya skeleti: sarlavha, filtrlar va Gant qatorlari. */
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 max-w-full rounded-lg skeleton-shimmer sm:h-8" />
          <div className="h-4 w-72 max-w-full rounded skeleton-shimmer" />
        </div>
        <div className="h-11 w-28 rounded-2xl skeleton-shimmer" />
      </div>

      <div className="space-y-2">
        <div className="h-11 w-full rounded-lg skeleton-shimmer" />
        <div className="hidden grid-cols-2 gap-2 sm:grid lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg skeleton-shimmer" />
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="h-9 w-72 max-w-full rounded-[10px] skeleton-shimmer" />
          <div className="h-9 w-52 max-w-full rounded-[10px] skeleton-shimmer" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex">
          <div className="w-[150px] shrink-0 border-r border-[var(--border)] md:w-[260px]">
            <div className="h-9 border-b border-[var(--border)]" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex h-11 items-center gap-2 border-b border-[var(--border)] px-2 md:px-3">
                <div className="hidden size-8 shrink-0 rounded-md skeleton-shimmer sm:block" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-4/5 rounded skeleton-shimmer" />
                  <div className="h-2.5 w-1/2 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="h-9 border-b border-[var(--border)]" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="relative h-11 border-b border-[var(--border)]">
                <div
                  className="absolute top-2.5 h-4 rounded-[5px] skeleton-shimmer"
                  style={{ left: `${(i * 13) % 45}%`, width: `${25 + ((i * 17) % 35)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
