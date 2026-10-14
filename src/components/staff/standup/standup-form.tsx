"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconCircleCheck } from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-biib/Button";
import { submitStandup } from "@/server/actions/standup";
import type { MyStandup } from "@/server/queries/standup";

/** Kunlik hisobot (standup) — kecha / bugun / toʻsiqlar; bitta kunga upsert. */
export function StandupForm({ initial }: { initial: MyStandup }) {
  const t = useTranslations("dashboard.standup");
  const tr = useTranslations();
  const [done, setDone] = useState(initial.doneYesterday);
  const [today, setToday] = useState(initial.plannedToday);
  const [blockers, setBlockers] = useState(initial.blockers);
  const [submitted, setSubmitted] = useState(initial.submitted);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await submitStandup({ doneYesterday: done, plannedToday: today, blockers });
      if (!r.ok) {
        toast.error(tr(`common.actionErrors.${r.error}` as "common.actionErrors.invalid"));
        return;
      }
      setSubmitted(true);
      toast.success(t("saved"));
    });
  }

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="t-label text-[var(--ink-2)]">{label}</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="min-h-[60px]"
        placeholder={placeholder}
      />
    </label>
  );

  return (
    <Card solid className="flex flex-col gap-3">
      {submitted && (
        <p className="flex items-center gap-1.5 t-small font-medium text-[var(--success)]">
          <IconCircleCheck className="size-4 shrink-0" aria-hidden /> {t("submittedToday")}
        </p>
      )}
      {field(t("doneYesterday"), done, setDone, t("donePlaceholder"))}
      {field(t("plannedToday"), today, setToday, t("todayPlaceholder"))}
      {field(t("blockers"), blockers, setBlockers, t("blockersPlaceholder"))}
      <div className="flex justify-end">
        <Button onClick={save} loading={pending}>
          {submitted ? t("update") : t("submit")}
        </Button>
      </div>
    </Card>
  );
}
