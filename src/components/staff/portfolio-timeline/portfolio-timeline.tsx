"use client";
import { Fragment, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Status } from "@/components/ui-biib/Status";
import { SmoothImage } from "@/components/ui/smooth-image";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import {
  computeScale,
  countActiveOverlaps,
  deriveStageBars,
  offsetPx,
  shortDate,
  timelineExtent,
  willMissContract,
  type Bar,
  type TimelineGroup,
  type TLProject,
  type Zoom,
} from "@/lib/projects/timeline";
import {
  BKRM_COLOR,
  ESTIMATED_STRIPES,
  KIND_COLOR,
  PLANNED_H,
  PLANNED_TOP,
  TimelineBar,
} from "./timeline-bar";

// Vertikal geometriya — REM da (ildiz 20px, 125% masshtabda ham oʻlchansin).
const ROW_H = 2.75;
const HEAD_H = 2.4;
const LANE_H = 2.1;
// Muddat olmosi — belgi, piksel (masshtabdan mustaqil).
const DIAMOND = 11;
// Chap ustun kengligi va unga tutash sticky yorliqlar cheti (bir joyda sozlanadi).
const LEFT_W = "w-[9.5rem] md:w-[16.5rem]";
const STICKY_L = "left-[10rem] md:left-[17rem]";
const NO_GROUP = "__none__";

type Row = { p: TLProject; bars: Bar[]; miss: boolean; first: string | null };
type Lane = { key: string; name: string; rows: Row[]; parallel: number };

function laneKey(p: TLProject, group: TimelineGroup): { key: string; name: string | null } {
  if (group === "studio") return { key: p.studioId ?? NO_GROUP, name: p.studioName };
  if (group === "type") return { key: p.typeId ?? NO_GROUP, name: p.typeName };
  if (group === "curator") {
    const c = p.curators[0];
    return { key: c?.id ?? NO_GROUP, name: c?.fullName ?? null };
  }
  return { key: "all", name: null };
}

function buildLanes(rows: Row[], group: TimelineGroup, noGroupLabel: string): Lane[] {
  const map = new Map<string, Lane>();
  for (const r of rows) {
    const { key, name } = laneKey(r.p, group);
    const lane = map.get(key) ?? { key, name: key === NO_GROUP || !name ? noGroupLabel : name, rows: [], parallel: 0 };
    lane.rows.push(r);
    map.set(key, lane);
  }
  const lanes = [...map.values()];
  for (const l of lanes) l.parallel = countActiveOverlaps(l.rows.map((r) => r.bars));
  if (group !== "none") {
    lanes.sort((a, b) => {
      if (a.key === NO_GROUP) return 1;
      if (b.key === NO_GROUP) return -1;
      return a.name.localeCompare(b.name);
    });
  }
  return lanes;
}

/**
 * Portfel Gant diagrammasi: chapda loyihalar ustuni (gorizontal skrollda joyida
 * qoladi), oʻngda skrollanadigan vaqt shkalasi. Har bir loyiha — qator, har bir
 * bosqich — chiziq. Faqat oʻqish uchun. Zich jadval — qattiq (solid) karta.
 */
export function PortfolioTimeline({
  data,
  today,
  zoom,
  group,
}: {
  data: { projects: TLProject[] };
  today: string;
  zoom: Zoom;
  group: TimelineGroup;
}) {
  const t = useTranslations("staffX.portfolioTimeline");
  const monthsRaw = t("monthsShort");
  const noGroupLabel = t("noGroup");

  const rows = useMemo<Row[]>(() => {
    const list = data.projects.map((p) => {
      const bars = deriveStageBars(p, today);
      const first = bars.reduce<string | null>((m, b) => (m === null || b.start < m ? b.start : m), null);
      return { p, bars, miss: willMissContract(p, bars), first };
    });
    list.sort((a, b) => {
      if (a.first !== b.first) {
        if (a.first === null) return 1;
        if (b.first === null) return -1;
        return a.first < b.first ? -1 : 1;
      }
      return a.p.name.localeCompare(b.p.name);
    });
    return list;
  }, [data.projects, today]);

  const scale = useMemo(() => {
    const ext = timelineExtent(
      rows.map((r) => ({ bars: r.bars, deadline: r.p.deadline })),
      today,
    );
    return computeScale(ext.min, ext.max, zoom, monthsRaw.split(","));
  }, [rows, today, zoom, monthsRaw]);

  const lanes = useMemo(() => buildLanes(rows, group, noGroupLabel), [rows, group, noGroupLabel]);

  const todayX = offsetPx(today, scale) + scale.dayPx / 2;
  const scrollRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  // Ochilganda (va zoom oʻzgarganda) "bugun" chizigʻi diagramma qismining chapidan ~25% joyda turadi.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const leftW = leftRef.current?.offsetWidth ?? 0;
    el.scrollLeft = Math.max(0, todayX - (el.clientWidth - leftW) * 0.25);
  }, [todayX]);

  if (rows.length === 0) {
    return (
      <Card solid bare className="p-10 text-center t-small text-[var(--ink-2)]">
        {t("empty")}
      </Card>
    );
  }

  const showLanes = group !== "none";
  // Olmos (muddat) markazining REM dagi vertikal oʻrni — piksel oʻlchami bilan calc orqali.
  const diamondTop = `calc(${PLANNED_TOP + PLANNED_H / 2}rem - ${DIAMOND / 2}px)`;

  return (
    <Card solid bare className="isolate overflow-hidden">
      {/*
        Bitta skroll konteyneri (ikkala oʻq): chap ustun `sticky left-0`, sarlavha `sticky top-0`.
        Balandlik cheklangan — koʻp loyihada ham gorizontal skroll paneli doim koʻrinadi.
      */}
      <div
        ref={scrollRef}
        className="relative max-h-[min(78vh,calc(100dvh-10rem))] overflow-auto overscroll-x-contain"
      >
        <div className="flex w-max min-w-full">
          {/* ---------- Chap ustun: loyihalar ---------- */}
          <div
            ref={leftRef}
            className={cn("sticky left-0 z-[8] shrink-0 border-r border-[var(--line)] bg-[var(--surface)]", LEFT_W)}
          >
            <div
              className="sticky top-0 z-[1] flex items-center border-b border-[var(--line)] bg-[var(--surface)] px-2 t-micro font-bold uppercase text-[var(--ink-3)] md:px-3"
              style={{ height: `${HEAD_H}rem` }}
            >
              <span className="truncate">{t("projectsCount", { count: rows.length })}</span>
            </div>
            {lanes.map((lane) => (
              <Fragment key={lane.key}>
                {showLanes && (
                  <div
                    className="flex items-center gap-1.5 border-b border-[var(--line)] bg-[var(--surface-2)] px-2 md:px-3"
                    style={{ height: `${LANE_H}rem` }}
                  >
                    <span className="min-w-0 flex-1 truncate t-small font-bold text-[var(--ink)]" title={lane.name}>
                      {lane.name}
                    </span>
                    <span className="shrink-0 rounded-[var(--radius-s)] border border-[var(--line)] bg-[var(--surface)] px-1.5 t-micro font-bold tabular-nums text-[var(--ink-2)]">
                      {lane.rows.length}
                    </span>
                  </div>
                )}
                {lane.rows.map((r) => (
                  <ProjectCell key={r.p.id} row={r} willMissLabel={t("willMiss")} />
                ))}
              </Fragment>
            ))}
          </div>

          {/* ---------- Oʻng: vaqt shkalasi ---------- */}
          <div className="relative shrink-0 grow" style={{ width: scale.widthPx }}>
            {/* Vertikal toʻr chiziqlari */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {scale.ticks.map((tk) => (
                <div
                  key={tk.iso}
                  className={cn("absolute bottom-0 top-0 w-px", tk.major ? "bg-[var(--line-strong)]" : "bg-[var(--line)]")}
                  style={{ left: offsetPx(tk.iso, scale) }}
                />
              ))}
            </div>

            {/* Sarlavha: oy / chorak / yil belgilari (vertikal skrollda tepada qoladi) */}
            <div
              className="sticky top-0 z-[6] border-b border-[var(--line)] bg-[var(--surface)]"
              style={{ height: `${HEAD_H}rem` }}
            >
              {scale.ticks.map((tk) => (
                <span
                  key={tk.iso}
                  className={cn(
                    "absolute bottom-0 top-0 whitespace-nowrap border-l pl-1.5 pt-1 t-micro tabular-nums",
                    tk.major
                      ? "border-[var(--line-strong)] font-bold text-[var(--ink)]"
                      : "border-[var(--line)] font-medium text-[var(--ink-3)]",
                  )}
                  style={{ left: offsetPx(tk.iso, scale) }}
                >
                  {tk.label}
                </span>
              ))}
              <span
                className="absolute bottom-0.5 z-[1] -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-s)] px-1.5 py-0.5 t-micro font-bold leading-none text-[var(--on-tint)]"
                style={{ left: todayX, backgroundColor: "var(--tint)" }}
              >
                {t("today")}
              </span>
            </div>

            {lanes.map((lane) => (
              <Fragment key={lane.key}>
                {showLanes && (
                  <div
                    className="relative flex items-center border-b border-[var(--line)] bg-[var(--surface-2)]"
                    style={{ height: `${LANE_H}rem` }}
                  >
                    {/* sticky — gorizontal skrollda chap ustun yonida koʻrinib turadi */}
                    <span
                      className={cn(
                        "z-[3] ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-s)] border px-2 py-0.5 t-micro font-bold",
                        STICKY_L,
                        lane.parallel >= 3
                          ? "sticky border-transparent bg-[var(--warning-soft)] text-[var(--warning)]"
                          : "sticky border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)]",
                      )}
                    >
                      {lane.parallel >= 3 && <IconAlertTriangle className="size-3.5 shrink-0" aria-hidden />}
                      {t("parallel", { count: lane.parallel })}
                    </span>
                  </div>
                )}
                {lane.rows.map((r) => (
                  <div key={r.p.id} className="relative border-b border-[var(--line)]" style={{ height: `${ROW_H}rem` }}>
                    {r.bars.map((b, i) => (
                      <TimelineBar key={b.stageId ?? `legacy-${i}`} bar={b} projectId={r.p.id} scale={scale} today={today} />
                    ))}
                    {r.p.deadline && (
                      <span
                        role="img"
                        aria-label={`${t("contractDeadline")}: ${shortDate(r.p.deadline, today)}`}
                        title={`${t("contractDeadline")}: ${shortDate(r.p.deadline, today)}`}
                        className="absolute z-[5] rotate-45 rounded-[2px] bg-[var(--ink)] ring-2 ring-[var(--surface)]"
                        style={{
                          width: DIAMOND,
                          height: DIAMOND,
                          left: offsetPx(r.p.deadline, scale) + scale.dayPx - DIAMOND / 2,
                          top: diamondTop,
                        }}
                      />
                    )}
                    {r.bars.length === 0 && (
                      <span className={cn("sticky inline-flex h-full items-center pl-2 t-micro font-medium text-[var(--ink-3)]", STICKY_L)}>
                        {t("noDates")}
                      </span>
                    )}
                  </div>
                ))}
              </Fragment>
            ))}

            {/* Bugungi kun chizigʻi — koʻk (--tint) */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 z-[4] w-0.5 opacity-90"
              style={{ left: todayX - 1, top: `${HEAD_H}rem`, backgroundColor: "var(--tint)" }}
            />
          </div>
        </div>
      </div>

      <Legend />
    </Card>
  );
}

function ProjectCell({ row, willMissLabel }: { row: Row; willMissLabel: string }) {
  const { p, miss } = row;
  const sub = p.studioName ?? p.typeName ?? "";
  return (
    <div className="flex items-center gap-2 border-b border-[var(--line)] px-2 md:px-3" style={{ height: `${ROW_H}rem` }}>
      <div className="relative hidden size-8 shrink-0 overflow-hidden rounded-[var(--radius-s)] bg-[var(--surface-2)] sm:block">
        {p.posterUrl ? (
          <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover" />
        ) : (
          <span className="grid size-full select-none place-items-center text-sm font-bold text-[var(--ink-3)]">
            {p.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/projects/${p.id}`}
            prefetch={false}
            title={p.name}
            className="min-w-0 flex-1 truncate t-small font-semibold leading-tight text-[var(--ink)] transition-colors hover:text-[var(--tint)]"
          >
            {p.name}
          </Link>
          <span className="shrink-0 t-micro font-bold tabular-nums text-[var(--ink-2)]">{p.progress}%</span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {miss && (
            <span title={willMissLabel} className="inline-flex shrink-0">
              <Status tone="danger" className="px-1.5">
                <span className="inline-flex items-center">
                  <IconAlertTriangle className="size-3.5" aria-hidden />
                  <span className="sr-only">{willMissLabel}</span>
                </span>
              </Status>
            </span>
          )}
          {sub && <span className="min-w-0 flex-1 truncate t-micro text-[var(--ink-2)]">{sub}</span>}
          {p.curators.length > 0 && (
            <div className="ml-auto hidden shrink-0 -space-x-2 md:flex">
              {p.curators.slice(0, 3).map((c) => (
                <span key={c.id} title={c.fullName} className="inline-flex">
                  <UserAvatar
                    name={c.fullName}
                    avatarUrl={c.avatarUrl}
                    size="xs"
                    clickable={false}
                    className="size-5 text-[0.5rem] ring-1 ring-[var(--surface)]"
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const t = useTranslations("staffX.portfolioTimeline");
  const swatch = "inline-block h-2.5 w-5 shrink-0 rounded-[var(--radius-s)]";
  const items: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: "completed", label: t("legendCompleted"), icon: <span className={swatch} style={{ backgroundColor: KIND_COLOR.completed }} /> },
    { key: "active", label: t("legendActive"), icon: <span className={swatch} style={{ backgroundColor: KIND_COLOR.active }} /> },
    { key: "late", label: t("legendLate"), icon: <span className={swatch} style={{ backgroundColor: KIND_COLOR.late }} /> },
    {
      key: "locked",
      label: t("legendLocked"),
      icon: <span className={cn(swatch, "border border-dashed border-[var(--line-strong)]")} />,
    },
    {
      key: "estimated",
      label: t("legendEstimated"),
      icon: (
        <span
          className={swatch}
          style={{ backgroundColor: KIND_COLOR.active, backgroundImage: ESTIMATED_STRIPES, opacity: 0.85 }}
        />
      ),
    },
    {
      key: "actual",
      label: t("legendActual"),
      icon: <span className="inline-block h-[3px] w-5 shrink-0 rounded-[2px] bg-[var(--ink-2)] opacity-70" />,
    },
    {
      key: "bkrm",
      label: t("legendBkrm"),
      icon: <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: BKRM_COLOR }} />,
    },
    {
      key: "today",
      label: t("today"),
      icon: <span className="inline-block h-3 w-0.5 shrink-0" style={{ backgroundColor: "var(--tint)" }} />,
    },
    {
      key: "deadline",
      label: t("contractDeadline"),
      icon: <span className="inline-block size-2 shrink-0 rotate-45 rounded-[1px] bg-[var(--ink)]" />,
    },
  ];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--line)] px-3 py-3 t-small text-[var(--ink-2)] md:px-4">
      {items.map((it) => (
        <span key={it.key} className="inline-flex min-w-0 items-center gap-1.5">
          {it.icon}
          <span className="break-words">{it.label}</span>
        </span>
      ))}
    </div>
  );
}
