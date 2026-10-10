"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconDeviceFloppy as DeviceFloppy } from "@tabler/icons-react";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui-biib/Button";
import { Textarea } from "@/components/ui-biib/Textarea";
import { DocMarkdown } from "@/components/councils/doc-markdown";
import { formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { SUMMARY_MAX_LENGTH } from "@/lib/reports/weekly-brief-core";
import { saveWeeklySummary } from "@/server/actions/weekly-brief";

/**
 * "Hafta xulosasi": direktor / oʻrinbosar / egasi uchun matn maydoni (Markdown), qolganlar
 * uchun faqat oʻqish. BIIB: ramkasiz — oyna karta ichida bevosita maydon yoki matn (ichki
 * quti yoʻq). Hafta almashganda holat `key={weekStart}` orqali yangilanadi.
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
    <Section title={t("summary")}>
      <Card>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words t-small text-[var(--ink-3)]">{meta ?? t("markdownHint")}</p>
              <Button
                variant="primary"
                size="40"
                icon={DeviceFloppy}
                onClick={onSave}
                loading={pending}
                disabled={pending || !dirty}
                className="max-sm:w-full"
              >
                {tc("save")}
              </Button>
            </div>
          </div>
        ) : note ? (
          <div className="space-y-2">
            <div className="min-w-0 break-words">
              <DocMarkdown>{note}</DocMarkdown>
            </div>
            {meta && <p className="break-words t-small text-[var(--ink-3)]">{meta}</p>}
          </div>
        ) : (
          <p className="py-4 text-center t-small text-[var(--ink-3)]">{t("noSummary")}</p>
        )}
      </Card>
    </Section>
  );
}
