"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPencil as Pencil, IconDeviceFloppy as Save } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { setStageRequirements } from "@/server/actions/stages";

/** Xodim studiya bu bosqiçda nima topşirişi kerakligini yozadi (studiya uçun faqat öqiş). */
export function StageRequirementsEditor({ stageId, initial }: { stageId: string; initial: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initial ?? "");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      try {
        await setStageRequirements(stageId, val);
        toast.success(t("common.saved"));
        setEditing(false);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  if (!editing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{t("review.requirements")}</h4>
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline">
            <Pencil className="size-3.5" />{t("common.edit")}
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{initial || t("review.noRequirements")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{t("review.requirements")}</h4>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={3}
        autoFocus
        placeholder={t("review.requirements")}
        className="w-full resize-y rounded-xl border border-[var(--input)] bg-[var(--surface-1)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--subtle)] focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
      />
      <div className="flex items-center justify-end gap-2">
        <Button onClick={() => { setEditing(false); setVal(initial ?? ""); }} disabled={pending} variant="ghost" size="sm">{t("common.cancel")}</Button>
        <Button onClick={save} disabled={pending} size="sm"><Save className="size-4" />{t("common.save")}</Button>
      </div>
    </div>
  );
}
