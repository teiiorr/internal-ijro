/** Loyihalar skeleti: sarlavha, segmented, filtrlar va poster tori (tör sahifaga mos). */
export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Sarlavha + amallar + segmented */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="h-8 w-44 max-w-full rounded-lg skeleton-shimmer" />
          <div className="h-10 w-40 rounded-[var(--radius-control)] skeleton-shimmer" />
        </div>
        <div className="h-10 w-56 max-w-full rounded-[12px] skeleton-shimmer" />
      </div>

      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Holat segmented */}
        <div className="h-10 w-full max-w-md rounded-[12px] skeleton-shimmer" />
        {/* Qidiruv */}
        <div className="h-11 w-full rounded-[var(--radius-control)] skeleton-shimmer" />

        {/* Poster tori */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-media)] p-2">
              <div className="aspect-square w-full rounded-xl skeleton-shimmer" />
              <div className="space-y-2 px-1.5 pb-1 pt-2.5">
                <div className="mx-auto h-4 w-4/5 rounded skeleton-shimmer" />
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                  <div className="h-5 w-14 rounded-[var(--radius-s)] skeleton-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
