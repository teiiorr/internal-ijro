"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconCalendarPlus, IconClockHour4 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/dates";
import { cancelDeadlineRequest, requestDeadlineExtension } from "@/server/actions/task-edits";
import { diffDaysIso, errorMessageKey, fmtDdMm, minExtensionDate, toTashkentIso } from "./task-edit-logic";

export type DeadlineRequestDialogProps = {
  taskId: string;
  /** Current deadline as a Tashkent calendar date 'YYYY-MM-DD'. */
  currentDeadlineDate: string | null;
  /** The viewer's own pending request, if any. */
  pending: { id: string; requestedDate: string; reason: string } | null;
};

export function DeadlineRequestDialog({ taskId, currentDeadlineDate, pending }: DeadlineRequestDialogProps) {
  const t = useTranslations("staffX.taskEdit");
  const tr = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();

  if (!currentDeadlineDate) return null;
  const currentDate = currentDeadlineDate;

  function onOpenChange(next: boolean) {
    if (next) {
      setDate("");
      setReason("");
    }
    setOpen(next);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      try {
        const res = await requestDeadlineExtension({ taskId, requestedDate: date, reason: reason.trim() });
        if (!res.ok) {
          toast.error(t(errorMessageKey(res.error), { name: res.detail ?? "" }));
          return;
        }
        toast.success(t("sentToast"));
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(t("errors.generic"), { description: (err as Error).message });
      }
    });
  }

  function cancel(id: string) {
    if (!window.confirm(t("cancelConfirm"))) return;
    start(async () => {
      try {
        const res = await cancelDeadlineRequest(id);
        if (!res.ok) {
          toast.error(t(errorMessageKey(res.error), { name: res.detail ?? "" }));
          return;
        }
        toast.success(t("cancelledToast"));
        router.refresh();
      } catch (err) {
        toast.error(t("errors.generic"), { description: (err as Error).message });
      }
    });
  }

  if (pending) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--border)] pt-3">
        <span
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-[var(--warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--warning)]"
          title={pending.reason}
        >
          <IconClockHour4 className="size-3.5 shrink-0" />
          <span className="truncate">{t("requestSent", { date: fmtDdMm(pending.requestedDate) })}</span>
        </span>
        <button
          type="button"
          onClick={() => cancel(pending.id)}
          disabled={busy}
          className="text-xs font-semibold text-[var(--muted)] underline-offset-4 hover:text-[var(--danger)] hover:underline disabled:opacity-50"
        >
          {t("cancelRequest")}
        </button>
      </div>
    );
  }

  const today = toTashkentIso(new Date());
  const minDate = minExtensionDate(currentDate, today);
  const extra = date && date >= minDate ? diffDaysIso(currentDate, date) : null;
  const valid = !!date && date >= minDate && reason.trim().length >= 3;

  return (
    <div className="border-t border-[var(--border)] pt-3">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="max-w-full">
            <IconCalendarPlus className="size-4 shrink-0 text-[var(--primary)]" />
            <span className="truncate">{t("requestExtension")}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] p-5 sm:p-7">
          <DialogHeader className="pr-10">
            <DialogTitle>{t("requestExtension")}</DialogTitle>
            <DialogDescription>{t("requestHint")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label>{t("currentDeadline")}</Label>
                <p className="flex h-11 items-center truncate rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold">
                  {formatDate(`${currentDate}T00:00:00Z`, locale)}
                </p>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="dr-date">{t("newDeadline")}</Label>
                <Input id="dr-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>
            {extra !== null && (
              <p className="text-xs font-semibold text-[var(--primary)]">{t("extraDays", { days: extra })}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="dr-reason">{t("reason")}</Label>
              <Textarea
                id="dr-reason"
                rows={4}
                minLength={3}
                maxLength={1000}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                {tr("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy || !valid}>
                {tr("common.send")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
