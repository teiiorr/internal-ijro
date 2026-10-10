"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconArrowForwardUp as ArrowForward, IconCheck as Check, IconHourglass as Hourglass } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { localizeName } from "@/lib/names";
import { carryoverTopic, tashkentDateOf } from "@/lib/councils/resolution-status";
import type { ResolutionRow } from "@/server/queries/council-resolutions";
import { addCarryoverToAgenda } from "@/server/actions/council-resolutions";
import { DueCell, NS, ResolutionStatusChip, fmtDay, useResolutionErrorText } from "./shared";

const PREVIEW = 5;

/**
 * "Oldingi qarorlar ijrosi (N)": still-open points of earlier meetings of the same
 * council, each with a one-click "Kun tartibiga qoʻshish" → a '№N-qaror ijrosi
 * toʻgʻrisida' agenda item on the upcoming meeting. Points already on the agenda
 * (same generated topic) show as added.
 */
export function OpenResolutionsCarryover({
  meetingId,
  rows,
  agendaTopics,
}: {
  meetingId: string;
  rows: ResolutionRow[];
  /** Topics already on the upcoming agenda — used to mark carried-over points. */
  agendaTopics: string[];
}) {
  const t = useTranslations(NS);
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0) return null;
  const topics = new Set(agendaTopics);
  const visible = showAll ? rows : rows.slice(0, PREVIEW);

  return (
    <div
      className="rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--warning)_35%,transparent)] px-4 py-4 sm:px-5"
      style={{ background: "color-mix(in oklab, var(--warning) 8%, transparent)" }}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Hourglass className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
        <div className="min-w-0">
          <h3 className="break-words font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)]">{t("carryover", { count: rows.length })}</h3>
          <p className="t-micro text-[var(--ink-3)]">{t("carryoverHint")}</p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-[color-mix(in_oklab,var(--warning)_22%,transparent)]">
        {visible.map((r) => (
          <CarryoverItem
            key={r.id}
            row={r}
            meetingId={meetingId}
            added={topics.has(carryoverTopic(r.number, tashkentDateOf(r.meetingDate)))}
          />
        ))}
      </ul>
      {rows.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm font-semibold text-[var(--tint)] hover:underline"
        >
          {showAll ? t("showLess") : t("showAll", { count: rows.length })}
        </button>
      )}
    </div>
  );
}

function CarryoverItem({ row, meetingId, added }: { row: ResolutionRow; meetingId: string; added: boolean }) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const errorText = useResolutionErrorText();
  const [pending, start] = useTransition();

  function add() {
    start(async () => {
      try {
        const res = await addCarryoverToAgenda({ resolutionId: row.id, meetingId });
        if (!res.ok) {
          toast.error(errorText(res.error));
          if (res.error === "already_added") router.refresh();
          return;
        }
        toast.success(t("toast.addedToAgenda"));
        router.refresh();
      } catch {
        toast.error(tg("common.error"));
      }
    });
  }

  return (
    <li className="flex min-w-0 flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--ink-3)]">
          <span className="tabular-nums text-[var(--ink)]">№{row.number}</span>
          <span>,</span>
          <span>{t("meetingOf", { date: fmtDay(row.meetingDate, locale) })}</span>
          <ResolutionStatusChip status={row.effective} />
        </div>
        <p className="line-clamp-2 break-words text-sm font-medium text-[var(--ink)] [overflow-wrap:anywhere]">{row.text}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-3)]">
          <span className="min-w-0 truncate">
            {row.responsibleName ? localizeName(row.responsibleName, locale) : t("noResponsible")}
          </span>
          <DueCell dueDate={row.dueDate} effective={row.effective} />
        </div>
      </div>
      {added ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-[var(--success)] sm:self-center">
          <Check className="size-4" />
          {t("inAgenda")}
        </span>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={pending} className="shrink-0 self-start sm:self-center">
          <ArrowForward className="size-4" />
          {t("addToAgenda")}
        </Button>
      )}
    </li>
  );
}
