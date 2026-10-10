import { getTranslations } from "next-intl/server";
import { IconDownload as Download } from "@tabler/icons-react";
import { requirePosition } from "@/lib/session";
import { can } from "@/lib/permissions/capabilities";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented, type SegmentedItem } from "@/components/ui-biib/Segmented";
import { CouncilTabs } from "@/components/councils/council-tabs";
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

const STATUSES: EffectiveStatus[] = ["open", "due_soon", "overdue", "done", "cancelled"];

/** Kengash qarorlari ijrosi — every resolution point across both councils. */
export default async function CouncilResolutionsPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  // hr (and anyone outside the kengash audience) is redirected to /dashboard.
  const me = await requirePosition([...STAFF_POSITIONS]);
  const [t, tnav, tc] = await Promise.all([
    getTranslations("staffX.councilResolutions"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);
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

  // Segmented / i18n Link lokalni oʻzi qoʻshadi — lokalsiz baza beramiz.
  const base = "/kengashlar/ijro";
  const total = STATUSES.reduce((n, s) => n + counters[s], 0);
  const seg = (status?: EffectiveStatus) => resolutionsHref({ ...filters, status }, base, me.position);
  const count = (n: number) => <span className="ml-1 tabular-nums text-[var(--ink-3)]">{n}</span>;

  // 5 ta StatCard oʻrniga bitta holat segmentlagichi + sanoqlar (A6.5 Kengashlar).
  // "Hammasi" + har bir holat; faol holatni bosish uni oʻchiradi (toggle).
  const segments: SegmentedItem[] = [
    { href: seg(undefined), label: <>{tc("all")}{count(total)}</>, active: !filters.status },
    ...STATUSES.map((s) => ({
      href: filters.status === s ? seg(undefined) : seg(s),
      label: (
        <>
          {t(`status.${s}`)}
          {count(counters[s])}
        </>
      ),
      active: filters.status === s,
    })),
  ];

  const exportHref = resolutionsHref(filters, "/api/export/council-resolutions", me.position);

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <PageHeader
        title={tnav("group.councils")}
        tools={<CouncilTabs active="ijro" />}
        actions={
          <Button asChild variant="outline">
            <a href={exportHref}>
              <Download className="size-4" /> {t("export")}
            </a>
          </Button>
        }
      />

      <div className="flex min-w-0 flex-col gap-4">
        <Segmented
          items={segments}
          className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        />

        <ResolutionsFilters current={filters} position={me.position} people={options.people} departments={options.departments} />

        <ResolutionsTable rows={tableRows} />
      </div>
    </div>
  );
}
