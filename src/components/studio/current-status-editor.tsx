"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconActivityHeartbeat as Pulse, IconPencil as Pencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/dates";
import { updateProjectCurrentStatus } from "@/server/actions/studio";
import { studioErrorKey } from "./errors";

export type LastStatusUpdate = { byName: string | null; at: Date | string; byStudio: boolean } | null;

/**
 * "Joriy holat" — studiya (yoki ruxsati bor xodim) loyihaning hozirgi holatini yozadi.
 * Matn projects.current_status'ga tushadi: xodimlar uni loyiha sahifasida va
 * bosh sahifadagi "Joriy holat" vidjetida darhol ko'radi.
 */
export function CurrentStatusEditor({
  projectId,
  text,
  lastUpdate,
  canEdit,
}: {
  projectId: string;
  text: string | null;
  lastUpdate?: LastStatusUpdate;
  canEdit: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text ?? "");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      try {
        await updateProjectCurrentStatus({ projectId, text: value });
        toast.success(t("studio.currentStatus.saved"));
        setEditing(false);
        router.refresh();
      } catch (e) {
        toast.error(t(studioErrorKey(e)));
      }
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary-soft)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-white">
          <Pulse className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold">{t("studio.currentStatus.title")}</h3>
            {canEdit && !editing && (
              <Button size="sm" variant="outline" onClick={() => { setValue(text ?? ""); setEditing(true); }}>
                <Pencil className="size-4" /> {t("studio.currentStatus.edit")}
              </Button>
            )}
          </div>

          {editing ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-[var(--muted)]">{t("studio.currentStatus.hint")}</p>
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={4}
                maxLength={2000}
                autoFocus
                placeholder={t("studio.currentStatus.placeholder")}
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="mr-auto text-xs tabular-nums text-[var(--subtle)]">{value.length}/2000</span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                  {t("studio.currentStatus.cancel")}
                </Button>
                <Button size="sm" onClick={save} disabled={pending}>
                  {t("studio.currentStatus.save")}
                </Button>
              </div>
            </div>
          ) : text?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
          ) : (
            <p className="mt-2 text-sm italic text-[var(--muted)]">{t("studio.currentStatus.empty")}</p>
          )}

          {!editing && lastUpdate && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {lastUpdate.byStudio && (
                <span className="mr-1.5 inline-flex rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {t("studio.currentStatus.byStudio")}
                </span>
              )}
              {t("studio.currentStatus.updatedBy", { name: lastUpdate.byName ?? "—", time: timeAgo(lastUpdate.at, locale) })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
