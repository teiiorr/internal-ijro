"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconChartBar as Chart } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { reportStageProgress } from "@/server/actions/studio";
import { studioErrorKey } from "./errors";

export type StageProgressData = { progress: number; note: string | null; at: Date | string; byName?: string | null } | null;

function tone(p: number) {
  return p >= 100 ? "bg-[#16A34A]" : p >= 50 ? "bg-[var(--primary)]" : "bg-[#E08C10]";
}

/** Studiya xabar bergan bajarilish foizi — xodim va studiya sahifalarida bir xil ko'rinadi. */
export function StageProgressBadge({ data, compact = false }: { data: StageProgressData; compact?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  if (!data) {
    return compact ? null : <p className="text-sm italic text-[var(--muted)]">{t("studio.progress.none")}</p>;
  }
  return (
    <div className={cn("space-y-1.5", compact && "min-w-[140px]")}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--muted)]">{t("studio.progress.reported")}</span>
        <span className="font-bold tabular-nums">{data.progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className={cn("h-full rounded-full transition-all", tone(data.progress))} style={{ width: `${data.progress}%` }} />
      </div>
      {!compact && data.note && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{data.note}</p>}
      <p className="text-[11px] text-[var(--subtle)]">
        {data.byName ? `${data.byName} · ` : ""}
        {timeAgo(data.at, locale)}
      </p>
    </div>
  );
}

/** Studiya faol bosqich bo'yicha bajarilish foizini yuboradi (kurator real vaqtda ko'radi). */
export function StageProgressReporter({ stageId, latest }: { stageId: string; latest: StageProgressData }) {
  const t = useTranslations();
  const router = useRouter();
  const [value, setValue] = useState<number>(latest?.progress ?? 0);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      try {
        await reportStageProgress({ stageId, progress: value, note: note.trim() || undefined });
        toast.success(t("studio.progress.saved"));
        setNote("");
        router.refresh();
      } catch (e) {
        toast.error(t(studioErrorKey(e)));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">
          <Chart className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold">{t("studio.progress.title")}</h3>
          <p className="text-xs text-[var(--muted)]">{t("studio.progress.hint")}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-[var(--muted)]">{t("studio.progress.percent")}</span>
          <span className="text-2xl font-extrabold tabular-nums text-[var(--primary)]">{value}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label={t("studio.progress.percent")}
          className="w-full cursor-pointer accent-[var(--primary)]"
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--subtle)]">
          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>
      </div>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={t("studio.progress.notePlaceholder")}
        aria-label={t("studio.progress.note")}
      />
      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>{t("studio.progress.submit")}</Button>
      </div>

      {latest && (
        <div className="border-t border-[var(--border)] pt-3">
          <StageProgressBadge data={latest} />
        </div>
      )}
    </div>
  );
}
