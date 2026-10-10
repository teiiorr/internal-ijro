import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { IconList, IconTimeline } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { getPortfolioTimeline, PORTFOLIO_PROJECT_LIMIT } from "@/server/queries/portfolio";
import { parseGroup, parseZoom, tashkentToday } from "@/lib/projects/timeline";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented } from "@/components/ui-biib/Segmented";
import { TimelineFilters } from "@/components/staff/portfolio-timeline/timeline-filters";
import { PortfolioTimeline } from "@/components/staff/portfolio-timeline/portfolio-timeline";

/**
 * Loyihalar xronologiyasi — portfel Gant diagrammasi. Barcha ichki xodimlar uchun
 * (kontragentni dashboard layout qaytaradi). Faqat oʻqish; pul koʻrsatilmaydi.
 */
export default async function ProjectsTimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const [t, locale, sp] = await Promise.all([
    getTranslations("staffX.portfolioTimeline"),
    getLocale(),
    searchParams,
  ]);
  const get = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };

  const search = get("search")?.trim() || null;
  const typeId = get("typeId") || null;
  const studioId = get("studioId") || null;
  const curatorId = get("curatorId") || null;
  const zoom = parseZoom(get("zoom"));
  const group = parseGroup(get("group"));

  const data = await getPortfolioTimeline(
    {
      search,
      typeId,
      studioId,
      curatorId,
      overdueOnly: get("overdue") === "1",
      includeCompleted: get("completed") === "1",
    },
    locale,
  );
  const today = tashkentToday();

  // "Roʻyxat" — /projects ga umumiy filtrlar (qidiruv, tur) bilan qaytadi.
  const back = new URLSearchParams();
  if (search) back.set("search", search);
  if (typeId) back.set("typeId", typeId);
  const backHref = `/projects${back.toString() ? `?${back.toString()}` : ""}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        tools={
          <Segmented
            items={[
              { href: backHref, label: t("list"), active: false, icon: <IconList className="size-4" /> },
              { href: "/projects/timeline", label: t("title"), active: true, icon: <IconTimeline className="size-4" /> },
            ]}
          />
        }
      />

      <TimelineFilters types={data.types} studios={data.studios} curators={data.curators} />

      <PortfolioTimeline data={{ projects: data.projects }} today={today} zoom={zoom} group={group} />

      {data.limited && (
        <p className="text-xs text-[var(--muted)]">{t("limited", { count: PORTFOLIO_PROJECT_LIMIT })}</p>
      )}
    </div>
  );
}
