export default function Loading() {
  return (
    <div className="animate-pulse space-y-5 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-11 shrink-0 rounded-full skeleton-shimmer" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-7 w-56 max-w-full rounded-lg skeleton-shimmer" />
          <div className="h-4 w-72 max-w-full rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="h-11 w-full rounded-[10px] skeleton-shimmer" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 rounded-lg skeleton-shimmer" />
        ))}
      </div>
      <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
