"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { useTranslations } from "next-intl";
import { IconArrowRight } from "@tabler/icons-react";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { cn } from "@/lib/utils";
import { offsetPx, shortDate, widthPx, type Bar, type Scale } from "@/lib/projects/timeline";

/**
 * Qator ichidagi vertikal geometriya — REM da (ildiz 20px, 125% masshtab bilan
 * oʻlchansin). Reja chizigʻi 0.65–1.8rem, haqiqiy chiziq 1.95rem.
 */
export const PLANNED_TOP = 0.65;
export const PLANNED_H = 1.15;
export const ACTUAL_TOP = 1.95;
export const ACTUAL_H = 0.22;
/** BKRM navbati belgisi — pushti/binafsha emas, token (info/koʻk). */
export const BKRM_COLOR = "var(--info)";

type BarKind = "completed" | "active" | "late" | "locked";

export function barKind(bar: Bar): BarKind {
  if (bar.status === "completed") return "completed";
  if (bar.status === "active") return bar.late ? "late" : "active";
  return "locked";
}

/** Chiziq ranglari — tokenlarga bogʻlangan: bajarilgan=success, ishda=warning,
 *  kechikkan=danger, navbatda=punktir `--line-strong`. */
export const KIND_COLOR: Record<BarKind, string> = {
  completed: "var(--success)",
  active: "var(--warning)",
  late: "var(--danger)",
  locked: "var(--line-strong)",
};

const KIND_TONE: Record<BarKind, StatusTone> = {
  completed: "success",
  active: "warning",
  late: "danger",
  locked: "neutral",
};

const KIND_LABEL = {
  completed: "legendCompleted",
  active: "legendActive",
  late: "legendLate",
  locked: "legendLocked",
} as const;

/** Taxminiy (muddati kiritilmagan) chiziqlar uchun chiziqcha naqsh. */
export const ESTIMATED_STRIPES =
  "repeating-linear-gradient(135deg, transparent 0 4px, rgba(255,255,255,0.38) 4px 7px)";

const MIN_BAR_PX = 4;
const LABEL_MIN_PX = 56;

/**
 * Bitta bosqich chizigʻi + uning haqiqiy bajarilish chizigʻi va tooltip'i.
 * Sichqoncha: hover — tooltip, bosish — bosqich sahifasi. Sensorli ekran: bosish
 * tooltip'ni ochadi/yopadi, ichidagi havola sahifaga olib boradi.
 */
export function TimelineBar({
  bar,
  projectId,
  scale,
  today,
}: {
  bar: Bar;
  projectId: string;
  scale: Scale;
  today: string;
}) {
  const t = useTranslations("staffX.portfolioTimeline");
  const [open, setOpen] = useState(false);
  const [tap, setTap] = useState(false);
  const pointerType = useRef<string | null>(null);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  const kind = barKind(bar);
  const color = KIND_COLOR[kind];
  const href = bar.stageId ? `/projects/${projectId}/stages/${bar.stageId}` : `/projects/${projectId}`;
  const left = offsetPx(bar.start, scale);
  const width = Math.max(MIN_BAR_PX, widthPx(bar.start, bar.end, scale));
  const planned = `${shortDate(bar.start, today)} – ${shortDate(bar.end, today)}`;
  const actualStart = bar.actualStart;
  const actualEnd = bar.actualEnd;
  const statusLabel = t(KIND_LABEL[kind]);
  const locked = kind === "locked";

  return (
    <>
      <Popover.Root
        open={open}
        onOpenChange={(o) => {
          if (!o) setOpen(false);
        }}
      >
        <Popover.Anchor asChild>
          <Link
            ref={anchorRef}
            href={href}
            prefetch={false}
            aria-label={`${bar.name}: ${t("planned")} ${planned}, ${statusLabel}`}
            onPointerDown={(e) => {
              pointerType.current = e.pointerType;
            }}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") return;
              setTap(false);
              setOpen(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse" && !tap) setOpen(false);
            }}
            onClick={(e) => {
              const touch = pointerType.current !== null && pointerType.current !== "mouse";
              pointerType.current = null;
              if (!touch) return; // sichqoncha / klaviatura — oddiy navigatsiya
              e.preventDefault();
              if (open && tap) {
                setOpen(false);
              } else {
                setTap(true);
                setOpen(true);
              }
            }}
            className={cn(
              "absolute z-[2] flex items-center overflow-visible rounded-[var(--radius-s)] outline-none",
              "transition-[filter,box-shadow] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--tint)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]",
              locked && "border border-dashed border-[var(--line-strong)] hover:border-[var(--ink-3)]",
            )}
            style={{
              left,
              width,
              top: `${PLANNED_TOP}rem`,
              height: `${PLANNED_H}rem`,
              backgroundColor: locked ? "transparent" : color,
              backgroundImage: bar.estimated && !locked ? ESTIMATED_STRIPES : undefined,
              opacity: bar.estimated && !locked ? 0.85 : undefined,
            }}
          >
            {width >= LABEL_MIN_PX && (
              <span
                className={cn(
                  "pointer-events-none min-w-0 truncate px-1.5 leading-none t-micro",
                  // Oq yorliq + yengil soya: amber/yashil/qizil toʻldirishda ikkala mavzuda ham oʻqiladi.
                  locked
                    ? "text-[var(--ink-3)]"
                    : "text-[var(--on-tint)] [text-shadow:0_1px_1.5px_rgba(0,0,0,0.45)]",
                )}
              >
                {bar.name}
              </span>
            )}
            {bar.bkrmTurn && (
              <span
                aria-hidden
                className="absolute -right-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-2 ring-[var(--surface)]"
                style={{ backgroundColor: BKRM_COLOR }}
              />
            )}
          </Link>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={12}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              // Chiziqning oʻzini bosish — onClick oʻzi ochib/yopadi.
              if (anchorRef.current && e.target instanceof Node && anchorRef.current.contains(e.target)) e.preventDefault();
            }}
            className={cn(
              "z-50 w-[min(18rem,calc(100vw-24px))] rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)] shadow-[var(--shadow-2)]",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              !tap && "pointer-events-none",
            )}
          >
            <p className="break-words t-small font-semibold leading-snug">{bar.name}</p>
            <dl className="mt-2 space-y-1 t-micro font-medium">
              <div className="flex gap-2">
                <dt className="shrink-0 text-[var(--ink-3)]">{t("planned")}:</dt>
                <dd className="min-w-0 break-words tabular-nums text-[var(--ink)]">
                  {planned}
                  {bar.estimated && <span className="text-[var(--ink-3)]">, {t("legendEstimated")}</span>}
                </dd>
              </div>
              {actualStart && actualEnd && (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-[var(--ink-3)]">{t("legendActual")}:</dt>
                  <dd className="min-w-0 tabular-nums text-[var(--ink)]">
                    {shortDate(actualStart, today)} – {shortDate(actualEnd, today)}
                  </dd>
                </div>
              )}
              {bar.responsibleName && (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-[var(--ink-3)]">{t("responsible")}:</dt>
                  <dd className="min-w-0 break-words text-[var(--ink)]">{bar.responsibleName}</dd>
                </div>
              )}
            </dl>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Status tone={KIND_TONE[kind]}>{statusLabel}</Status>
              {bar.status === "active" && !bar.estimated && (
                <DeadlineCountdown deadline={`${bar.end}T23:59:59+05:00`} />
              )}
            </div>
            {bar.bkrmTurn && (
              <p className="mt-2 flex items-center gap-1.5 t-micro font-semibold" style={{ color: BKRM_COLOR }}>
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: BKRM_COLOR }} />
                {t("legendBkrm")}
              </p>
            )}
            {tap && (
              <Link
                href={href}
                prefetch={false}
                className="mt-3 inline-flex items-center gap-1 t-micro font-semibold text-[var(--tint)] hover:underline"
              >
                {bar.stageId ? t("openStage") : t("openProject")}
                <IconArrowRight className="size-3.5" />
              </Link>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {actualStart && actualEnd && actualEnd >= actualStart && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[2px]"
          style={{
            left: offsetPx(actualStart, scale),
            width: Math.max(2, widthPx(actualStart, actualEnd, scale)),
            top: `${ACTUAL_TOP}rem`,
            height: `${ACTUAL_H}rem`,
            backgroundColor: locked ? "var(--ink-3)" : color,
            opacity: 0.65,
          }}
        />
      )}
    </>
  );
}
