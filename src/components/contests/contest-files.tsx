"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconFileText as FileText, IconDownload as Download, IconTrash as Trash2, IconPlus as Plus, IconLoader2 as Loader2, IconPaperclip as Paperclip } from "@tabler/icons-react";
import { compressImage } from "@/lib/images/compress";
import { removeContestFile } from "@/server/actions/contests";
import { formatDate } from "@/lib/dates";
import type { ContestFile } from "@/server/queries/contests";

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContestFiles({ contestId, files, canManage }: { contestId: string; files: ContestFile[]; canManage: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      let f = file;
      try { const r = await compressImage(file); f = r.file; } catch { /* original */ }
      const qs = new URLSearchParams({ contestId, name: f.name });
      const res = await fetch(`/api/files/contest-files?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!res.ok) { toast.error(t("tanlov.photoError")); return; }
      toast.success(t("projects.stageDocs.added"));
      router.refresh();
    } catch {
      toast.error(t("tanlov.photoError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold"><Paperclip className="size-4 text-[var(--muted)]" />{t("tanlov.files")}</h3>
        {canManage && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            {t("tanlov.addFile")}
          </button>
        )}
        <input ref={fileRef} type="file" className="sr-only" onChange={onPick} />
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("tanlov.noFiles")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {files.map((f) => (
            <li key={f.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" title={f.fileName}>{f.fileName}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {humanSize(f.fileSize)}{f.uploaderName ? ` · ${f.uploaderName}` : ""} · {formatDate(f.uploadedAt as Date)}
                </p>
              </div>
              <a href={f.fileUrl} download className="grid size-8 shrink-0 place-items-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" title={t("common.download")}>
                <Download className="size-4" />
              </a>
              {canManage && (
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  disabled={pending}
                  onClick={() => start(async () => { await removeContestFile(f.id); router.refresh(); })}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
