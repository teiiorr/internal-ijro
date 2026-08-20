export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-48 rounded-lg skeleton-shimmer" />
      <div className="h-px bg-[var(--border)]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/5 rounded skeleton-shimmer" />
              <div className="h-3 w-2/5 rounded skeleton-shimmer" />
            </div>
          </div>
          <div className="h-2 rounded-full skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-lg skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-3/5 rounded-lg skeleton-shimmer" />
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full skeleton-shimmer" />
            <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="h-5 w-32 rounded skeleton-shimmer mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded skeleton-shimmer" />
              <div className="h-5 w-24 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 order-2 lg:order-1">
          <div className="h-5 w-28 rounded skeleton-shimmer mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        </div>
        <div className="order-1 lg:order-2 aspect-square rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  );
}
