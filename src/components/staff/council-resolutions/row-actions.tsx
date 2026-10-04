"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconBan as Ban,
  IconCircleCheck as CircleCheck,
  IconInfoCircle as InfoCircle,
  IconPencil as Pencil,
  IconSend as Send,
  IconTrash as Trash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/permissions/tasks";
import type { EffectiveStatus, RowPermissions } from "@/lib/councils/resolution-status";
import {
  cancelResolution,
  closeResolution,
  deleteResolution,
  sendResolutionAsTask,
} from "@/server/actions/council-resolutions";
import { FIELD, NS, fmtDay, useResolutionErrorText } from "./shared";

export type ActionRow = {
  id: string;
  number: number;
  text: string;
  taskId: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  responsibleAvatar: string | null;
  dueDate: string | null;
  status: string;
  effective: EffectiveStatus;
};

type DialogKind = "close" | "cancel" | "send" | "delete" | null;

/**
 * Per-row action buttons + their dialogs (close with note, cancel with reason,
 * send as task, delete). Flags are UI hints; every action is re-authorized on the server.
 */
export function ResolutionRowActions({
  row,
  perms,
  onEdit,
  only,
  className,
}: {
  row: ActionRow;
  perms: RowPermissions;
  /** Shows the edit button when given. */
  onEdit?: () => void;
  /** Restrict to these actions (e.g. the tracking table shows only close + send). */
  only?: Array<"edit" | "send" | "close" | "cancel" | "delete">;
  className?: string;
}) {
  const t = useTranslations(NS);
  const [open, setOpen] = useState<DialogKind>(null);
  const show = (a: "edit" | "send" | "close" | "cancel" | "delete") => !only || only.includes(a);

  const canSend = perms.canSend && show("send");
  const canClose = perms.canClose && show("close");
  const canCancel = perms.canCancel && show("cancel");
  const canDelete = perms.canDelete && show("delete");
  const canEdit = perms.canEdit && !!onEdit && show("edit");
  if (!canSend && !canClose && !canCancel && !canDelete && !canEdit) return null;

  function onSendClick() {
    if (!row.responsibleUserId || !row.dueDate) {
      toast.error(t("needResponsibleAndDue"));
      return;
    }
    setOpen("send");
  }

  const close = () => setOpen(null);

  return (
    <div className={className ?? "flex flex-wrap items-center gap-1.5"}>
      {canSend && (
        <Button type="button" size="sm" variant="soft" onClick={onSendClick}>
          <Send className="size-4" />
          <span className="truncate">{t("sendAsTask")}</span>
        </Button>
      )}
      {canClose && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen("close")}>
          <CircleCheck className="size-4 text-[var(--success)]" />
          <span className="truncate">{t("close")}</span>
        </Button>
      )}
      {canEdit && (
        <IconAction label={t("edit")} onClick={onEdit}>
          <Pencil className="size-4" />
        </IconAction>
      )}
      {canCancel && (
        <IconAction label={t("cancel")} onClick={() => setOpen("cancel")}>
          <Ban className="size-4" />
        </IconAction>
      )}
      {canDelete && (
        <IconAction label={t("delete")} onClick={() => setOpen("delete")} danger>
          <Trash className="size-4" />
        </IconAction>
      )}

      {canClose && open === "close" && <NoteDialog mode="close" row={row} onDone={close} />}
      {canCancel && open === "cancel" && <NoteDialog mode="cancel" row={row} onDone={close} />}
      {canSend && open === "send" && <SendAsTaskDialog row={row} onDone={close} />}
      {canDelete && open === "delete" && <DeleteDialog row={row} onDone={close} />}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={danger ? "text-[var(--danger)] hover:text-[var(--danger)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}
    >
      {children}
    </Button>
  );
}

/** Close (done) or cancel a point — both require a note. Mounted only while open. */
function NoteDialog({ mode, row, onDone }: { mode: "close" | "cancel"; row: ActionRow; onDone: () => void }) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const router = useRouter();
  const errorText = useResolutionErrorText();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = `res-note-${mode}-${row.id}`;

  function submit() {
    const value = note.trim();
    if (value.length < 2) {
      setError(t("errors.noteTooShort"));
      return;
    }
    setError(null);
    start(async () => {
      try {
        const res = mode === "close" ? await closeResolution({ id: row.id, note: value }) : await cancelResolution({ id: row.id, note: value });
        if (!res.ok) {
          toast.error(errorText(res.error));
          return;
        }
        toast.success(mode === "close" ? t("toast.closed") : t("toast.cancelled"));
        onDone();
        router.refresh();
      } catch {
        toast.error(tg("common.error"));
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onDone()}>
      <DialogContent className="max-w-md p-5 sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg sm:text-xl">
            {mode === "close" ? t("closeTitle") : t("cancelTitle")} · №{row.number}
          </DialogTitle>
          <DialogDescription className="line-clamp-3 break-words">{row.text}</DialogDescription>
        </DialogHeader>
        {mode === "close" && row.taskId && (
          <p className="flex items-start gap-2 rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-sm font-medium text-[var(--warning)]">
            <InfoCircle className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{t("directorOverride")}</span>
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor={id}>{mode === "close" ? t("closeNote") : t("cancelNote")}</Label>
          <Textarea
            id={id}
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[96px]"
            disabled={pending}
            autoFocus
          />
          {mode === "close" && <p className="text-xs text-[var(--muted)]">{t("closeHint")}</p>}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            {tg("common.cancel")}
          </Button>
          <Button type="button" variant={mode === "close" ? "success" : "destructive"} onClick={submit} disabled={pending}>
            {mode === "close" ? <CircleCheck className="size-4" /> : <Ban className="size-4" />}
            {mode === "close" ? t("close") : t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendAsTaskDialog({ row, onDone }: { row: ActionRow; onDone: () => void }) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const errorText = useResolutionErrorText();
  const [pending, start] = useTransition();
  const [priority, setPriority] = useState<TaskPriority>("high");
  const selectId = `res-send-prio-${row.id}`;

  function submit() {
    start(async () => {
      try {
        const res = await sendResolutionAsTask({ id: row.id, priority });
        if (!res.ok) {
          toast.error(errorText(res.error));
          return;
        }
        toast.success(t("taskCreated", { reg: res.regNumber ?? "—" }));
        onDone();
        router.refresh();
      } catch {
        toast.error(tg("common.error"));
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onDone()}>
      <DialogContent className="max-w-md p-5 sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg sm:text-xl">{t("sendAsTask")} · №{row.number}</DialogTitle>
          <DialogDescription>{t("sendHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:p-4">
          <p className="line-clamp-4 whitespace-pre-line break-words text-sm font-medium">{row.text}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar name={row.responsibleName ?? "?"} avatarUrl={row.responsibleAvatar} size="xs" clickable={false} />
              <span className="truncate font-semibold">{localizeName(row.responsibleName, locale)}</span>
            </span>
            {row.dueDate && (
              <span className="whitespace-nowrap text-[var(--muted)]">
                {t("dueDate")}: <span className="font-semibold text-[var(--foreground)]">{fmtDay(row.dueDate, locale)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={selectId}>{tg("common.priority")}</Label>
          <select
            id={selectId}
            className={FIELD}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            disabled={pending}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {tg(`tasks.priority.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            {tg("common.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            <Send className="size-4" />
            {tg("common.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ row, onDone }: { row: ActionRow; onDone: () => void }) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const router = useRouter();
  const errorText = useResolutionErrorText();
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      try {
        const res = await deleteResolution(row.id);
        if (!res.ok) {
          toast.error(errorText(res.error));
          return;
        }
        toast.success(t("toast.deleted"));
        onDone();
        router.refresh();
      } catch {
        toast.error(tg("common.error"));
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onDone()}>
      <DialogContent className="max-w-sm p-5 sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">{t("deleteConfirm", { number: row.number })}</DialogTitle>
          <DialogDescription className="line-clamp-3 break-words">{row.text}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            {tg("common.cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={pending}>
            <Trash className="size-4" />
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
