"use client";
import dynamic from "next/dynamic";

/** Placeholder while the recharts chunk loads (keeps layout height stable). */
function ChartSkeleton({ h }: { h: number }) {
  return <div className="skeleton-shimmer w-full rounded-xl" style={{ height: h }} />;
}

/**
 * recharts is heavy (~hundreds of KB). These wrappers keep it out of the
 * initial dashboard bundle — the chart chunk loads on the client after paint.
 * The dynamic() calls live in this client module so code-splitting works
 * (a Server Component dynamically importing a Client Component would not split).
 */
export const ProjectStatusDonut = dynamic(
  () => import("./project-status-donut").then((m) => m.ProjectStatusDonut),
  { ssr: false, loading: () => <ChartSkeleton h={264} /> },
);

export const ProjectTypeBar = dynamic(
  () => import("./project-type-bar").then((m) => m.ProjectTypeBar),
  { ssr: false, loading: () => <ChartSkeleton h={220} /> },
);
