"use client";
import dynamic from "next/dynamic";

/** recharts bölagi yuklanguncha turuvçi placeholder (layout balandligini barqaror uşlab turadi). */
function ChartSkeleton({ h }: { h: number }) {
  return <div className="skeleton-shimmer w-full rounded-xl" style={{ height: h }} />;
}

/**
 * recharts oğir (~yuzlab KB). Bu wrapperlar uni boşlanğiç dashboard bundlega
 * qöşmaydi — grafik bölagi mijoz tomonida, paintdan keyin yuklanadi.
 * dynamic() çaqiruvlari şu client modulda turadi, şunda code-splitting işlaydi
 * (Server Component içida Client Componentni dinamik import qilsa, bölinmaydi).
 */
export const ProjectStatusDonut = dynamic(
  () => import("./project-status-donut").then((m) => m.ProjectStatusDonut),
  { ssr: false, loading: () => <ChartSkeleton h={264} /> },
);

export const ProjectTypeBar = dynamic(
  () => import("./project-type-bar").then((m) => m.ProjectTypeBar),
  { ssr: false, loading: () => <ChartSkeleton h={220} /> },
);
