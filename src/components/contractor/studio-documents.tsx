"use client";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import {
  IconDownload as Download, IconFileText as FileText, IconFolder as Folder,
  IconPlus as Plus, IconLoader2 as Loader2, IconPhoto as Photo,
} from "@tabler/icons-react";
import { compressImage } from "@/lib/images/compress";
import { formatDate } from "@/lib/dates";

type Doc = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  fileMimeType: string | null;
  category: string | null;
  uploadedAt: Date | string;
};
type Staged = { file: File; originalSize: number; compressed: boolean };

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const isImage = (m: string | null) => !!m && m.startsWith("image/");

/**
 * Studio-facing document + media uploader. Studios file documents/photos into
 * named folders; big images are re-rendered smaller client-side before they hit
 * the wire. Everything is scoped to the studio's own project by the API route.
 */
export function StudioDocuments({
  projectId,
  documents,
  suggestions,
  maxBytes,
}: {
  projectId: string;
  documents: Doc[];
  suggestions: string[];
  maxBytes: number;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const uncategorized = t("projects.stageDocs.uncategorized");
  const dlId = `sfolders-${projectId}`;

  const groups = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of documents) {
      const key = (d.category ?? "").trim();
      (map.get(key) ?? map.set(key, []).get(key)!).push(d);
    }
    const out = [...map.entries()]
      .filter(([k]) => k !== "")
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, docs]) => ({ key: k, name: k, docs }));
    const loose = map.get("");
    if (loose && loose.length) out.push({ key: "", name: uncategorized, docs: loose });
    return out;
  }, [documents, uncategorized]);

  const folderNames = useMemo(() => {
    const set = new Set<string>(suggestions);
    for (const d of documents) if (d.category) set.add(d.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [documents, suggestions]);

  async function onFileChange(file: File | null) {
    if (!file) { setStaged(null); return; }
    setPreparing(true);
    try {
      const r = await compressImage(file);
      setStaged({ file: r.file, originalSize: r.originalSize, compressed: r.compressed });
    } catch {
      setStaged({ file, originalSize: file.size, compressed: false });
    } finally {
      setPreparing(false);
    }
  }

  function errorMessage(code: string): string {
    switch (code) {
      case "file_too_large": return t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) });
      case "file_empty": return t("projects.stageDocs.emptyFile");
      case "ext_forbidden": return t("projects.stageDocs.forbiddenType");
      default: return t("projects.stageDocs.uploadError");
    }
  }

  const tooBig = !!staged && staged.file.size > maxBytes;
  const busy = preparing || uploading;

  async function onAdd() {
    if (!staged || busy || tooBig) return;
    setUploading(true);
    try {
      const qs = new URLSearchParams({ projectId, name: staged.file.name });
      if (category.trim()) qs.set("category", category.trim());
      const res = await fetch(`/api/files/studio-docs?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": staged.file.type || "application/octet-stream" },
        body: staged.file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(errorMessage(body.error ?? ""));
        return;
      }
      setStaged(null);
      setPickerKey((k) => k + 1);
      toast.success(t("projects.stageDocs.added"));
      router.refresh();
    } catch {
      toast.error(t("projects.stageDocs.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("projects.stageDocs.empty")}</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key || "__loose__"} className="space-y-2">
              <div className="flex items-center gap-2">
                <Folder className="size-4 shrink-0 text-[var(--primary)]" />
                <span className="min-w-0 truncate text-sm font-semibold">{g.name}</span>
                <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[var(--muted)]">
                  {g.docs.length}
                </span>
              </div>
              <ul className="space-y-2 sm:pl-6">
                {g.docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 sm:gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                      {isImage(d.fileMimeType) ? <Photo className="size-4" /> : <FileText className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" title={d.fileName}>{d.fileName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {humanSize(d.fileSize)}{` · ${formatDate(d.uploadedAt as Date, locale)}`}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="icon-sm" title={t("common.download")}>
                      <a href={d.fileUrl} download><Download className="size-4" /></a>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="space-y-2.5 rounded-xl border border-dashed border-[var(--border-strong)] p-3">
        <label htmlFor={`scat-${projectId}`} className="block text-xs font-semibold text-[var(--muted)]">
          {t("projects.stageDocs.folder")}
        </label>
        <select
          id={`scat-${projectId}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 pr-8 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
        >
          <option value="">{t("projects.stageDocs.folderPlaceholder")}</option>
          {folderNames.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={120}
          placeholder={t("projects.stageDocs.newFolderPlaceholder") ?? t("projects.stageDocs.folderPlaceholder")}
          className="h-10 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none"
        />

        <FileInput key={pickerKey} ref={fileRef} onFileChange={onFileChange} disabled={busy} />

        {preparing && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Loader2 className="size-3.5 animate-spin" />{t("projects.stageDocs.preparing")}
          </p>
        )}
        {staged && !preparing && (
          <p className={"text-xs " + (tooBig ? "text-[var(--danger)]" : "text-[var(--muted)]")}>
            {staged.compressed
              ? t("projects.stageDocs.compressedNote", { from: humanSize(staged.originalSize), to: humanSize(staged.file.size) })
              : humanSize(staged.file.size)}
            {tooBig ? ` · ${t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) })}` : ""}
          </p>
        )}

        <p className="text-xs text-[var(--muted)]">{t("projects.stageDocs.folderHint", { folder: category.trim() || uncategorized })}</p>
        <p className="text-xs text-[var(--muted)]">{t("contractor.docs.mediaHint", { max: humanSize(maxBytes) })}</p>

        <Button type="button" onClick={onAdd} disabled={!staged || busy || tooBig} className="w-full">
          {uploading ? (<><Loader2 className="size-4 animate-spin" />{t("projects.stageDocs.uploading")}</>) : (<><Plus className="size-4" />{t("common.add")}</>)}
        </Button>
      </div>
    </div>
  );
}
