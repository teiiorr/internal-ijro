"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconDownload as Download,
  IconEye as Eye,
  IconFileTypeDocx as WordIcon,
  IconLoader2 as Loader2,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FileKindIcon } from "@/components/files/file-kind-icon";
import { AttachmentDropzone, QueuedFileList, useAttachmentQueue } from "@/components/tasks/attachment-queue";
import { formatDate } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { fileTypeLabel, hasThumbnail, humanSize, inlinePreviewMime } from "@/lib/files/file-kind";
import { isWordFile } from "@/lib/internal-docs/logic";
import { MAX_TASK_ATTACHMENTS, canDeleteTaskAttachment } from "@/lib/tasks/attachments";
import { getTaskAttachmentWordLink, removeTaskAttachment } from "@/server/actions/task-attachments";

export type TaskAttachmentView = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  uploadedAt: Date | string;
  uploadedByUserId: string | null;
  uploaderName: string | null;
};

/** Miniatyura faqat kiçik rasmlar uçun: katta skan serverda butunlay xotiraga öqiladi. */
const THUMB_MAX_BYTES = 8 * 1024 * 1024;

const iconButton =
  "grid size-10 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]";

/**
 * Topşiriq hujjatlari: har biri öz turi rangida (PDF, Word, Excel, rasm...). PDF va rasm
 * brauzerda oçiladi, Word fayli töğridan-töğri Wordda, qolgani asl nomi bilan yuklab
 * olinadi. Qöşiş huquqi borlarga pastda fayl taşlaş maydoni (bir neçta fayl, progress bilan).
 */
export function TaskAttachments({
  taskId,
  items,
  canAdd,
  viewer,
  createdByUserId,
  maxBytes,
}: {
  taskId: string;
  items: TaskAttachmentView[];
  canAdd: boolean;
  viewer: { id: string; position: string };
  createdByUserId: string;
  maxBytes: number;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const confirm = useConfirm();
  // Qaysi qatorda qaysi amal ketyapti: spinner aynan bosilgan tugmada aylanadi.
  const [busy, setBusy] = useState<{ id: string; action: "word" | "delete" } | null>(null);
  const [pending, start] = useTransition();
  const queue = useAttachmentQueue({ maxBytes, alreadyAttached: items.length });
  const full = items.length >= MAX_TASK_ATTACHMENTS;

  // Taşlangan fayllar darhol yuklanadi: alohida «Yuklaş» tugmasi şart emas.
  async function addFiles(files: File[]) {
    const accepted = queue.add(files);
    if (!accepted.length) return;
    const res = await queue.uploadAll(taskId, accepted);
    if (res.uploaded) {
      toast.success(t("tasks.attachments.uploaded", { count: res.uploaded }));
      // Bitta ötişda: yangi röyxat kelganda navbatdagi «tayyor» qatorlar bilan birga almaşadi (miltillamaydi).
      start(() => {
        queue.clearDone();
        router.refresh();
      });
    }
  }

  function openInWord(id: string) {
    setBusy({ id, action: "word" });
    start(async () => {
      try {
        const r = await getTaskAttachmentWordLink(id);
        if (!r.ok) {
          toast.error(t("tasks.attachments.wordOpenError"));
          return;
        }
        // Office URI: brauzer Word'ni işga tuşiradi, Word faylni imzolangan manzildan özi oladi.
        window.location.href = r.url;
      } catch {
        toast.error(t("tasks.attachments.wordOpenError"));
      } finally {
        setBusy(null);
      }
    });
  }

  async function remove(a: TaskAttachmentView) {
    if (!(await confirm({ description: t("tasks.attachments.confirmDelete", { name: a.fileName }), tone: "danger" }))) return;
    setBusy({ id: a.id, action: "delete" });
    start(async () => {
      try {
        const r = await removeTaskAttachment(a.id);
        if (!r.ok) {
          toast.error(t(`common.actionErrors.${r.error}` as "common.actionErrors.not_found"));
          return;
        }
        toast.success(t("tasks.attachments.deleted"));
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)]">
          {t("tasks.attachments.title")}
        </h3>
        {items.length > 0 && (
          <span className="t-small tabular-nums text-[var(--ink-3)]">{t("tasks.attachments.count", { count: items.length })}</span>
        )}
      </div>

      {items.length === 0 && !canAdd && <p className="t-small text-[var(--ink-3)]">{t("tasks.attachments.empty")}</p>}

      {items.length > 0 && (
        <Rows className={canAdd ? "mb-4" : undefined}>
          {items.map((a) => {
            const viewable = !!inlinePreviewMime(a.fileName);
            const word = isWordFile(a.fileName);
            const downloadHref = `/api/task-attachments/${a.id}/download`;
            const viewHref = `/api/task-attachments/${a.id}/view`;
            const canDelete = canDeleteTaskAttachment(viewer, { createdByUserId }, a.uploadedByUserId);
            const meta = [
              fileTypeLabel(a.fileName),
              humanSize(a.fileSize),
              a.uploaderName ? shortName(a.uploaderName) : null,
              formatDate(a.uploadedAt as Date, locale),
            ].filter(Boolean);
            const wordBusy = pending && busy?.id === a.id && busy.action === "word";
            const deleteBusy = pending && busy?.id === a.id && busy.action === "delete";
            const thumb = hasThumbnail(a.fileName) && (a.fileSize ?? Infinity) <= THUMB_MAX_BYTES;
            return (
              // Telefonda tugmalar ikkinçi qatorga tuşadi: fayl nomi butun kenglikda öqiladi.
              <Row key={a.id} className="flex-wrap items-center gap-y-1.5 sm:flex-nowrap">
                <FileKindIcon fileName={a.fileName} thumbUrl={thumb ? `${a.fileUrl}?w=96` : null} />
                <div className="min-w-0 flex-1">
                  <a
                    href={viewable ? viewHref : downloadHref}
                    target={viewable ? "_blank" : undefined}
                    rel={viewable ? "noopener" : undefined}
                    className="block truncate text-[0.9375rem] font-medium text-[var(--ink)] hover:text-[var(--tint)]"
                    title={a.fileName}
                  >
                    {a.fileName}
                  </a>
                  <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">{meta.join(", ")}</p>
                </div>
                <div className="-ml-2 flex w-full shrink-0 flex-wrap items-center gap-0.5 pl-[52px] sm:ml-0 sm:w-auto sm:flex-nowrap sm:pl-0">
                  {word && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={wordBusy}
                      onClick={() => openInWord(a.id)}
                      title={t("tasks.attachments.openInWordHint")}
                      aria-label={t("tasks.attachments.openInWord")}
                      className="mr-1"
                    >
                      {wordBusy ? <Loader2 className="size-4 animate-spin" /> : <WordIcon className="size-4" />}
                      {t("tasks.attachments.openInWord")}
                    </Button>
                  )}
                  {viewable && (
                    <a
                      href={viewHref}
                      target="_blank"
                      rel="noopener"
                      aria-label={t("tasks.attachments.view")}
                      title={t("tasks.attachments.view")}
                      className={iconButton}
                    >
                      <Eye className="size-[18px]" />
                    </a>
                  )}
                  <a href={downloadHref} aria-label={t("common.download")} title={t("common.download")} className={iconButton}>
                    <Download className="size-[18px]" />
                  </a>
                  {canDelete && (
                    <button
                      type="button"
                      disabled={deleteBusy}
                      aria-label={t("common.delete")}
                      title={t("common.delete")}
                      onClick={() => remove(a)}
                      className={`${iconButton} hover:text-[var(--danger)]`}
                    >
                      {deleteBusy ? <Loader2 className="size-[18px] animate-spin" /> : <Trash2 className="size-[18px]" />}
                    </button>
                  )}
                </div>
              </Row>
            );
          })}
        </Rows>
      )}

      {canAdd && !full && (
        <div className="flex min-w-0 flex-col gap-2.5">
          <QueuedFileList items={queue.items} onRemove={queue.busy ? undefined : queue.remove} />
          <AttachmentDropzone
            onFiles={addFiles}
            maxBytes={maxBytes}
            disabled={queue.busy}
            compact={items.length > 0}
          />
        </div>
      )}
      {canAdd && full && (
        <p className="t-small text-[var(--ink-3)]">{t("tasks.attachments.tooMany", { max: MAX_TASK_ATTACHMENTS })}</p>
      )}
    </Card>
  );
}
