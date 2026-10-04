"use client";
import { Fragment, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
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

const ROW_H = 44;
const HEAD_H = 36;
const LANE_H = 36;
const DIAMOND = 10;
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
 * qoladi), oʻngda skrollanadigan vaqt shkalasi. Har bir loyiha — 44px qator,
 * har bir bosqich — chiziq. Faqat oʻqish uchun.
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
      <Card>
        <div className="px-5 py-16 text-center text-sm text-[var(--muted)]">{t("empty")}</div>
      </Card>
    );
  }

  const showLanes = group !== "none";

  return (
    // glass-card hover'dagi "koʻtarilish" transform'i katta diagrammada keraksiz.
    <Card className="isolate overflow-hidden" style={{ transform: "none" }}>
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
            className="sticky left-0 z-[8] w-[150px] shrink-0 border-r border-[var(--border)] bg-[var(--card)] md:w-[260px]"
          >
            <div
              className="sticky top-0 z-[1] flex items-center border-b border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] md:px-3"
              style={{ height: HEAD_H }}
            >
              <span className="truncate">{t("projectsCount", { count: rows.length })}</span>
            </div>
            {lanes.map((lane) => (
              <Fragment key={lane.key}>
                {showLanes && (
                  <div
                    className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface-2)] px-2 md:px-3"
                    style={{ height: LANE_H }}
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold" title={lane.name}>
                      {lane.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-1.5 text-[11px] font-bold tabular-nums text-[var(--muted)]">
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
                  className={cn("absolute bottom-0 top-0 w-px", tk.major ? "bg-[var(--border-strong)]" : "bg-[var(--border)]")}
                  style={{ left: offsetPx(tk.iso, scale) }}
                />
              ))}
            </div>

            {/* Sarlavha: oy / chorak / yil belgilari (vertikal skrollda tepada qoladi) */}
            <div
              className="sticky top-0 z-[6] border-b border-[var(--border)] bg-[var(--card)]"
              style={{ height: HEAD_H }}
            >
              {scale.ticks.map((tk) => (
                <span
                  key={tk.iso}
                  className={cn(
                    "absolute bottom-0 top-0 whitespace-nowrap border-l pl-1.5 pt-1 text-[11px] leading-4 tabular-nums",
                    tk.major
                      ? "border-[var(--border-strong)] font-bold text-[var(--foreground)]"
                      : "border-[var(--border)] font-medium text-[var(--muted)]",
                  )}
                  style={{ left: offsetPx(tk.iso, scale) }}
                >
                  {tk.label}
                </span>
              ))}
              <span
                className="absolute bottom-0.5 z-[1] -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                style={{ left: todayX, backgroundColor: "var(--danger)" }}
              >
                {t("today")}
              </span>
            </div>

            {lanes.map((lane) => (
              <Fragment key={lane.key}>
                {showLanes && (
                  <div
                    className="relative flex items-center border-b border-[var(--border)] bg-[var(--surface-2)]"
                    style={{ height: LANE_H }}
                  >
                    {/* sticky — gorizontal skrollda chap ustun yonida koʻrinib turadi */}
                    <span
                      className={cn(
                        "sticky left-[158px] z-[3] ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold md:left-[268px]",
                        lane.parallel >= 3 ? "text-[#3b2a05]" : "bg-[var(--surface-3)] text-[var(--muted)]",
                      )}
                      style={lane.parallel >= 3 ? { backgroundColor: "var(--warning)" } : undefined}
                    >
                      {t("parallel", { count: lane.parallel })}
                    </span>
                  </div>
                )}
                {lane.rows.map((r) => (
                  <div key={r.p.id} className="relative border-b border-[var(--border)]" style={{ height: ROW_H }}>
                    {r.bars.map((b, i) => (
                      <TimelineBar key={b.stageId ?? `legacy-${i}`} bar={b} projectId={r.p.id} scale={scale} today={today} />
                    ))}
                    {r.p.deadline && (
                      <span
                        role="img"
                        aria-label={`${t("contractDeadline")}: ${shortDate(r.p.deadline, today)}`}
                        title={`${t("contractDeadline")}: ${shortDate(r.p.deadline, today)}`}
                        className="absolute z-[5] rotate-45 rounded-[2px] bg-[var(--foreground)] ring-2 ring-[var(--card)]"
                        style={{
                          width: DIAMOND,
                          height: DIAMOND,
                          left: offsetPx(r.p.deadline, scale) + scale.dayPx - DIAMOND / 2,
                          top: PLANNED_TOP + PLANNED_H / 2 - DIAMOND / 2,
                        }}
                      />
                    )}
                    {r.bars.length === 0 && (
                      <span className="sticky left-[158px] inline-flex h-full items-center pl-2 text-[11px] font-medium text-[var(--subtle)] md:left-[268px]">
                        {t("noDates")}
                      </span>
                    )}
                  </div>
                ))}
              </Fragment>
            ))}

            {/* Bugungi kun chizigʻi */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 z-[4] w-0.5 opacity-80"
              style={{ left: todayX - 1, top: HEAD_H, backgroundColor: "var(--danger)" }}
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
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-2 md:px-3" style={{ height: ROW_H }}>
      <div className="relative hidden size-8 shrink-0 overflow-hidden rounded-md bg-[var(--surface-2)] sm:block">
        {p.posterUrl ? (
          <SmoothImage src={p.posterUrl} alt={p.name} className="size-full object-cover" />
        ) : (
          <span className="grid size-full select-none place-items-center text-xs font-black text-[var(--subtle)]">
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
            className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight transition-colors hover:text-[var(--primary)]"
          >
            {p.name}
          </Link>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-[var(--muted)]">{p.progress}%</span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {miss && (
            <span
              title={willMissLabel}
              className="inline-flex min-w-0 shrink items-center gap-1 rounded px-1 py-px text-[10px] font-bold leading-tight text-white"
              style={{ backgroundColor: "var(--danger)" }}
            >
              <IconAlertTriangle className="size-3 shrink-0 md:hidden" aria-hidden />
              <span className="sr-only md:hidden">{willMissLabel}</span>
              <span className="hidden truncate md:inline">{willMissLabel}</span>
            </span>
          )}
          {sub && <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--muted)]">{sub}</span>}
          {p.curators.length > 0 && (
            <div className="ml-auto hidden shrink-0 -space-x-2 md:flex">
              {p.curators.slice(0, 3).map((c) => (
                <span key={c.id} title={c.fullName} className="inline-flex">
                  <UserAvatar
                    name={c.fullName}
                    avatarUrl={c.avatarUrl}
                    size="xs"
                    clickable={false}
                    className="size-5 text-[8px] ring-1 ring-[var(--card)]"
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
  const swatch = "inline-block h-2.5 w-5 shrink-0 rounded-[3px]";
  const items: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: "completed", label: t("legendCompleted"), icon: <span className={swatch} style={{ backgroundColor: KIND_COLOR.completed }} /> },
    { key: "active", label: t("legendActive"), icon: <span className={swatch} style={{ backgroundColor: KIND_COLOR.active }} /> },
    { key: "late", label: t("legendLate"), icon: <span className={swatch} style={{ backgroundColor: KIND_COLOR.late }} /> },
    {
      key: "locked",
      label: t("legendLocked"),
      icon: <span className={cn(swatch, "border border-dashed border-[var(--border-strong)]")} />,
    },
    {
      key: "estimated",
      label: t("legendEstimated"),
      icon: (
        <span
          className={swatch}
          style={{ backgroundColor: KIND_COLOR.active, backgroundImage: ESTIMATED_STRIPES, opacity: 0.8 }}
        />
      ),
    },
    {
      key: "actual",
      label: t("legendActual"),
      icon: <span className="inline-block h-[3px] w-5 shrink-0 rounded-full opacity-60" style={{ backgroundColor: KIND_COLOR.active }} />,
    },
    {
      key: "bkrm",
      label: t("legendBkrm"),
      icon: <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: BKRM_COLOR }} />,
    },
    {
      key: "today",
      label: t("today"),
      icon: <span className="inline-block h-3 w-0.5 shrink-0" style={{ backgroundColor: "var(--danger)" }} />,
    },
    {
      key: "deadline",
      label: t("contractDeadline"),
      icon: <span className="inline-block size-2 shrink-0 rotate-45 rounded-[1px] bg-[var(--foreground)]" />,
    },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--border)] px-3 py-3 text-xs text-[var(--muted)] md:px-4">
      {items.map((it) => (
        <span key={it.key} className="inline-flex min-w-0 items-center gap-1.5">
          {it.icon}
          <span className="break-words">{it.label}</span>
        </span>
      ))}
    </div>
  );
}
