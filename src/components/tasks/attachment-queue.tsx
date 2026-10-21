"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconPaperclip as Paperclip,
  IconX as X,
  IconCheck as Check,
  IconLoader2 as Loader2,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { fileTypeLabel, humanSize, isBlockedUpload } from "@/lib/files/file-kind";
import { MAX_TASK_ATTACHMENTS } from "@/lib/tasks/attachments";
import { uploadTaskAttachment } from "@/lib/tasks/upload-attachment";
import { FileKindIcon } from "@/components/files/file-kind-icon";

export type QueuedFile = {
  key: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

/** Xato kodi → foydalanuvçiga tuşunarli matn (server va mijoz tekşiruvlari uçun bitta joy). */
export function useAttachmentErrorText(maxBytes: number) {
  const t = useTranslations();
  return useCallback(
    (code: string): string => {
      switch (code) {
        case "file_too_large":
          return t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) });
        case "file_empty":
          return t("projects.stageDocs.emptyFile");
        case "ext_forbidden":
          return t("projects.stageDocs.forbiddenType");
        case "too_many_files":
          return t("tasks.attachments.tooMany", { max: MAX_TASK_ATTACHMENTS });
        case "network":
          return t("tasks.attachments.network");
        case "forbidden":
          return t("common.actionErrors.forbidden");
        default:
          return t("projects.stageDocs.uploadError");
      }
    },
    [t, maxBytes],
  );
}

/**
 * Yuklanadigan fayllar navbati: tanlaş, tekşiriş (tur, hajm, son), olib taşlaş va
 * topşiriq yaratilgaç ketma-ket yuklaş (har biri uçun progress). `alreadyAttached` —
 * topşiriqda allaqaçon bor hujjatlar soni (umumiy çegarani hisoblaş uçun).
 */
export function useAttachmentQueue({ maxBytes, alreadyAttached = 0 }: { maxBytes: number; alreadyAttached?: number }) {
  const errorText = useAttachmentErrorText(maxBytes);
  const [items, setItems] = useState<QueuedFile[]>([]);
  const [busy, setBusy] = useState(false);
  // Hodisa işlovçilari eng sönggi röyxatni öqişi uçun (render paytida ref yozilmaydi).
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const add = useCallback(
    (files: File[]): QueuedFile[] => {
      const fileId = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
      // Xato bilan qolgan qatorlar hisobga olinmaydi: şu faylni qayta taşlaş uni yangi urinişga almaştiradi.
      const live = itemsRef.current.filter((q) => q.status !== "error");
      const seen = new Set(live.map((q) => fileId(q.file)));
      const room = MAX_TASK_ATTACHMENTS - alreadyAttached - live.length;
      const accepted: QueuedFile[] = [];
      let overflow = false;
      for (const file of files) {
        const id = fileId(file);
        if (seen.has(id)) continue;
        let code: string | null = null;
        if (isBlockedUpload(file.name)) code = "ext_forbidden";
        else if (file.size === 0) code = "file_empty";
        else if (file.size > maxBytes) code = "file_too_large";
        if (code) {
          toast.error(`${file.name}: ${errorText(code)}`);
          continue;
        }
        if (accepted.length >= room) {
          overflow = true;
          continue;
        }
        seen.add(id);
        accepted.push({ key: `${id}:${Math.random().toString(36).slice(2)}`, file, status: "queued", progress: 0 });
      }
      if (overflow) toast.error(errorText("too_many_files"));
      if (accepted.length) {
        const retried = new Set(accepted.map((q) => fileId(q.file)));
        const keep = (q: QueuedFile) => !(q.status === "error" && retried.has(fileId(q.file)));
        itemsRef.current = [...itemsRef.current.filter(keep), ...accepted];
        setItems((prev) => [...prev.filter(keep), ...accepted]);
      }
      return accepted;
    },
    [alreadyAttached, maxBytes, errorText],
  );

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((q) => q.key !== key)), []);
  const reset = useCallback(() => setItems([]), []);
  /** Yuklangan fayllarni navbatdan olib taşlaydi (ular endi serverdagi röyxatda). */
  const clearDone = useCallback(() => setItems((prev) => prev.filter((q) => q.status !== "done")), []);

  /**
   * Navbatdagi fayllarni ketma-ket yuklaydi (yoki faqat `only` röyxatini, masalan hozirgina
   * taşlangan fayllarni). Natija: muvaffaqiyatli va xato soni.
   */
  const uploadAll = useCallback(
    async (taskId: string, only?: QueuedFile[]): Promise<{ uploaded: number; failed: number }> => {
      const queue = (only ?? itemsRef.current).filter((q) => q.status === "queued" || q.status === "error");
      if (!queue.length) return { uploaded: 0, failed: 0 };
      setBusy(true);
      let uploaded = 0;
      let failed = 0;
      const patch = (key: string, p: Partial<QueuedFile>) =>
        setItems((prev) => prev.map((q) => (q.key === key ? { ...q, ...p } : q)));
      try {
        for (const q of queue) {
          patch(q.key, { status: "uploading", progress: 0, error: undefined });
          const r = await uploadTaskAttachment(taskId, q.file, (f) => patch(q.key, { progress: f }));
          if (r.ok) {
            uploaded += 1;
            patch(q.key, { status: "done", progress: 1 });
          } else {
            failed += 1;
            patch(q.key, { status: "error", error: errorText(r.error) });
          }
        }
      } finally {
        setBusy(false);
      }
      return { uploaded, failed };
    },
    [errorText],
  );

  // Yuklaş davomida sahifani yopiş yoki yangilaşdan oldin brauzer ogohlantiradi.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const done = items.filter((q) => q.status === "done").length;
  return { items, add, remove, reset, clearDone, uploadAll, busy, done };
}

/**
 * Fayl taşlaş maydoni: bosilsa fayl tanlaş oynasi oçiladi, ustiga fayl olib kelinsa
 * yorişadi. `compact` — röyxat tölgandan keyingi ixçam «Yana fayl qöşiş» qatori.
 */
export function AttachmentDropzone({
  onFiles,
  maxBytes,
  disabled,
  compact,
  id,
  title,
  hint,
  accept,
}: {
  onFiles: (files: File[]) => void;
  maxBytes: number;
  disabled?: boolean;
  compact?: boolean;
  id?: string;
  /** Boşqa bölimlar uçun sarlavha, izoh va fayl turi filtri (standart: topşiriq hujjatlari). */
  title?: string;
  hint?: string;
  accept?: string;
}) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const label = compact ? t("tasks.attachments.addMore") : (title ?? t("tasks.attachments.dropTitle"));

  function pick(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (files.length && !disabled) onFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function open() {
    if (!disabled) inputRef.current?.click();
  }

  // Bloklangan holatda ham fayl tasdiqlanmagan holda brauzerga «tuşib» ketmasligi kerak
  // (aks holda brauzer PDFni şu varaqda oçib yuboradi): dragover/drop doim uşlanadi.
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) e.dataTransfer.dropEffect = "none";
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-describedby={compact ? undefined : hintId}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (disabled) return;
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={onDragOver}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      className={cn(
        "group flex w-full min-w-0 select-none items-center gap-3.5 rounded-[var(--radius-control)] border-2 border-dashed text-left outline-none transition-colors duration-[var(--dur-ui)] focus-visible:border-[var(--focus)]",
        compact ? "px-3.5 py-2.5" : "px-4 py-4 sm:px-5",
        dragging
          ? "border-[var(--tint)] bg-[color-mix(in_oklab,var(--tint)_9%,transparent)]"
          : "border-[color-mix(in_oklab,var(--line-strong)_55%,transparent)] bg-[var(--surface-2)]",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-[var(--tint)] hover:bg-[color-mix(in_oklab,var(--tint)_6%,var(--surface-2))]",
      )}
    >
      <input
        id={id}
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => pick(e.currentTarget.files)}
        onClick={(e) => e.stopPropagation()}
      />
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-[var(--radius-m)] bg-[var(--surface)] text-[var(--tint)] shadow-[var(--shadow-raised)] transition-transform duration-[var(--dur-ui)] [@media(hover:hover)]:group-hover:-translate-y-px",
          compact ? "size-8" : "size-11",
        )}
      >
        <Paperclip className={compact ? "size-4" : "size-5"} />
      </span>
      {compact ? (
        <span className="t-small font-semibold text-[var(--ink)]">{label}</span>
      ) : (
        <span className="min-w-0">
          <span className="block text-[0.9375rem] font-semibold text-[var(--ink)]">
            {dragging ? t("tasks.attachments.dropActive") : label}
          </span>
          <span id={hintId} className="mt-0.5 block t-small text-[var(--ink-3)]">
            {hint ?? t("tasks.attachments.dropHint", { max: humanSize(maxBytes) })}
          </span>
        </span>
      )}
    </div>
  );
}

/** Navbatdagi fayllar: tur belgisi, nom, hajm, yuklaş çiziği yoki xato, olib taşlaş. */
export function QueuedFileList({ items, onRemove }: { items: QueuedFile[]; onRemove?: (key: string) => void }) {
  const t = useTranslations();
  if (!items.length) return null;
  return (
    <ul className="flex min-w-0 flex-col gap-2">
      {items.map((q) => (
        <li
          key={q.key}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] border bg-[var(--surface)] px-3 py-2.5",
            q.status === "error" ? "border-[color-mix(in_oklab,var(--danger)_45%,transparent)]" : "border-[var(--line)]",
          )}
        >
          <FileKindIcon fileName={q.file.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--ink)]" title={q.file.name}>
              {q.file.name}
            </p>
            {q.status === "uploading" ? (
              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(q.progress * 100)}
                aria-label={q.file.name}
              >
                <div
                  className="h-full rounded-full bg-[var(--tint)] transition-[width] duration-200"
                  style={{ width: `${Math.max(4, Math.round(q.progress * 100))}%` }}
                />
              </div>
            ) : q.status === "error" ? (
              <p className="mt-0.5 break-words t-small text-[var(--danger)] [overflow-wrap:anywhere]">{q.error}</p>
            ) : (
              <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                {[fileTypeLabel(q.file.name), humanSize(q.file.size)].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          {q.status === "uploading" ? (
            <Loader2 className="size-[18px] shrink-0 animate-spin text-[var(--tint)]" aria-hidden />
          ) : q.status === "done" ? (
            <Check className="size-[18px] shrink-0 text-[var(--success)]" aria-label={t("tasks.attachments.uploadedOne")} />
          ) : onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(q.key)}
              aria-label={t("tasks.attachments.remove")}
              title={t("tasks.attachments.remove")}
              className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] hover:text-[var(--danger)]"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
