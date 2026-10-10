export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-7 w-40 rounded-lg skeleton-shimmer" />
          <div className="h-10 w-36 rounded-[var(--radius-control)] skeleton-shimmer" />
        </div>
        <div className="h-10 w-72 max-w-full rounded-[12px] skeleton-shimmer" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-80 max-w-full rounded-[12px] skeleton-shimmer" />
          <div className="h-11 w-full max-w-[16rem] rounded-[var(--radius-control)] skeleton-shimmer" />
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/5 rounded skeleton-shimmer" />
                  <div className="h-3 w-2/5 rounded skeleton-shimmer" />
                </div>
                <div className="h-6 w-20 rounded-[var(--radius-s)] skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
