import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  IconAlertTriangle as AlertTriangle,
  IconBan as Ban,
  IconCircleCheck as CircleCheck,
  IconCircleDashed as CircleDashed,
  IconClockHour4 as Clock,
  IconDownload as Download,
} from "@tabler/icons-react";
import { requirePosition } from "@/lib/session";
import { can } from "@/lib/permissions/capabilities";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { StatCard } from "@/components/ui/stat-card";
import { ResolutionsFilters } from "@/components/staff/council-resolutions/resolutions-filters";
import { ResolutionsTable, type TableRow } from "@/components/staff/council-resolutions/resolutions-table";
import {
  STAFF_POSITIONS,
  parseResolutionFilters,
  resolutionsHref,
  rowPermissions,
  type EffectiveStatus,
} from "@/lib/councils/resolution-status";
import {
  isResolutionEditor,
  listAllResolutions,
  listResolutionFilterOptions,
} from "@/server/queries/council-resolutions";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Kengash qarorlari ijrosi — every resolution point across both councils. */
export default async function CouncilResolutionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  // hr (and anyone outside the kengash audience) is redirected to /dashboard.
  const me = await requirePosition([...STAFF_POSITIONS]);
  const { locale } = await params;
  const t = await getTranslations("staffX.councilResolutions");
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = parseResolutionFilters(get, me.position);

  const [{ rows, counters }, options, editorEverywhere] = await Promise.all([
    listAllResolutions(me, filters),
    listResolutionFilterOptions(),
    isResolutionEditor(me),
  ]);

  const canAssign = can(me.position, "tasks.assign");
  const tableRows: TableRow[] = rows.map((r) => ({
    ...r,
    perms: rowPermissions(r, me, editorEverywhere || r.meetingCreatorId === me.id, canAssign),
  }));

  // StatCard renders next/link directly, so its hrefs carry the locale prefix themselves.
  const base = `/${locale}/kengashlar/ijro`;
  const statusHref = (s: EffectiveStatus) =>
    resolutionsHref({ ...filters, status: filters.status === s ? undefined : s }, base, me.position);
  const exportHref = resolutionsHref(filters, "/api/export/council-resolutions", me.position);

  const cards: Array<{
    key: EffectiveStatus;
    tone: "default" | "primary" | "success" | "warning" | "danger";
    icon: ReactNode;
  }> = [
    { key: "open", tone: "primary", icon: <CircleDashed className="size-4" /> },
    { key: "due_soon", tone: "warning", icon: <Clock className="size-4" /> },
    { key: "overdue", tone: "danger", icon: <AlertTriangle className="size-4" /> },
    { key: "done", tone: "success", icon: <CircleCheck className="size-4" /> },
    { key: "cancelled", tone: "default", icon: <Ban className="size-4" /> },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton fallbackHref="/kengashlar/smeta" className="mt-0.5" />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm font-medium text-[var(--muted)]">{t("subtitle")}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="self-start sm:shrink-0">
          <a href={exportHref}>
            <Download className="size-4" /> {t("export")}
          </a>
        </Button>
      </div>

      {/* Counters — each card toggles the ?status filter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => (
          <StatCard
            key={c.key}
            label={t(`status.${c.key}`)}
            value={counters[c.key]}
            icon={c.icon}
            tone={c.tone}
            href={statusHref(c.key)}
            filled={filters.status === c.key || (c.key === "overdue" && !filters.status && counters.overdue > 0)}
            className={i === cards.length - 1 ? "col-span-2 sm:col-span-1" : undefined}
          />
        ))}
      </div>

      <ResolutionsFilters current={filters} position={me.position} people={options.people} departments={options.departments} />

      <ResolutionsTable rows={tableRows} />
    </div>
  );
}
