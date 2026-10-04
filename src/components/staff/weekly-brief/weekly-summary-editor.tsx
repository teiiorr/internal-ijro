"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconDeviceFloppy as DeviceFloppy, IconNotes as Notes } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DocMarkdown } from "@/components/councils/doc-markdown";
import { formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { SUMMARY_MAX_LENGTH } from "@/lib/reports/weekly-brief-core";
import { saveWeeklySummary } from "@/server/actions/weekly-brief";
import { BriefSectionTitle } from "./brief-group";

/**
 * "Hafta xulosasi": direktor / oʻrinbosar / egasi uchun matn maydoni (Markdown), qolganlar
 * uchun DocMarkdown bilan faqat oʻqish. Hafta almashganda holat yangilanishi uchun sahifa
 * komponentni `key={weekStart}` bilan qayta yaratadi.
 */
export function WeeklySummaryEditor({
  weekStart,
  note,
  byName,
  at,
  canEdit,
  locale,
}: {
  weekStart: string;
  note: string | null;
  byName: string | null;
  /** ISO vaqt (serverdan satr sifatida) */
  at: string | null;
  canEdit: boolean;
  locale: string;
}) {
  const t = useTranslations("staffX.weeklyBrief");
  const tc = useTranslations("common");
  const router = useRouter();
  const [value, setValue] = useState(note ?? "");
  const [pending, start] = useTransition();
  const dirty = value.trim() !== (note ?? "").trim();

  const meta =
    note && (byName || at)
      ? t("summaryUpdated", {
          name: byName ? localizeName(byName, locale) : "—",
          date: at ? formatDateTime(at, locale) : "—",
        })
      : null;

  function onSave() {
    start(async () => {
      try {
        await saveWeeklySummary({ weekStart, note: value });
        toast.success(t("summarySaved"));
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        toast.error(
          msg === "forbidden"
            ? t("errors.forbidden")
            : msg === "week_not_finished"
              ? t("errors.weekNotFinished")
              : tc("error")
        );
      }
    });
  }

  return (
    <Card className="min-w-0">
      <CardContent className="space-y-3 p-4 sm:p-6">
        <BriefSectionTitle icon={<Notes className="size-5" />} title={t("summary")} />

        {canEdit ? (
          <div className="space-y-3">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("summaryPlaceholder")}
              maxLength={SUMMARY_MAX_LENGTH}
              rows={6}
              disabled={pending}
              aria-label={t("summary")}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words text-xs text-[var(--muted)]">{meta ?? t("markdownHint")}</p>
              <Button onClick={onSave} disabled={pending || !dirty} className="self-start sm:self-auto">
                <DeviceFloppy className="size-4" />
                {tc("save")}
              </Button>
            </div>
          </div>
        ) : note ? (
          <div className="space-y-2">
            <div className="min-w-0 break-words rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <DocMarkdown>{note}</DocMarkdown>
            </div>
            {meta && <p className="break-words text-xs text-[var(--muted)]">{meta}</p>}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-[var(--muted)]">{t("noSummary")}</p>
        )}
      </CardContent>
    </Card>
  );
}
