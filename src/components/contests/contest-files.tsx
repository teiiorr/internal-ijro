"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { IconFileText as FileText, IconDownload as Download, IconTrash as Trash2, IconPlus as Plus, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
  const locale = useLocale();
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
      try { const r = await compressImage(file); f = r.file; } catch { /* asl fayl */ }
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <h3 className="font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.1875rem]">{t("tanlov.files")}</h3>
          <span className="t-micro tabular-nums text-[var(--ink-3)]">{files.length}</span>
        </div>
        {canManage && (
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {t("tanlov.addFile")}
          </Button>
        )}
        <input ref={fileRef} type="file" className="sr-only" onChange={onPick} />
      </div>

      {files.length === 0 ? (
        <p className="t-small text-[var(--ink-3)]">{t("tanlov.noFiles")}</p>
      ) : (
        <ul className="-my-1 divide-y divide-[var(--line)]">
          {files.map((f) => (
            <li key={f.id} className="flex min-w-0 items-center gap-3 py-3">
              <FileText className="size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <a
                  href={f.fileUrl}
                  download
                  className="block truncate text-sm font-medium text-[var(--ink)] hover:text-[var(--tint)]"
                  title={f.fileName}
                >
                  {f.fileName}
                </a>
                <p className="truncate t-small text-[var(--ink-3)]">
                  {humanSize(f.fileSize)}{f.uploaderName ? `, ${f.uploaderName}` : ""}, {formatDate(f.uploadedAt as Date, locale)}
                </p>
              </div>
              <a
                href={f.fileUrl}
                download
                aria-label={t("common.download")}
                title={t("common.download")}
                className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <Download className="size-[18px]" />
              </a>
              {canManage && (
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  title={t("common.delete")}
                  disabled={pending}
                  onClick={() => start(async () => { await removeContestFile(f.id); router.refresh(); })}
                  className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="size-[18px]" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
