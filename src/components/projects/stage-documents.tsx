"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Download, Trash2, FileText, Folder, FolderInput, Plus, Loader2 } from "lucide-react";
import { removeStageDocument, setStageDocumentCategory } from "@/server/actions/stages";
import { compressImage } from "@/lib/images/compress";
import { formatDate } from "@/lib/dates";

type Doc = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  category: string | null;
  uploadedAt: Date | string;
  uploaderName: string | null;
};

type Staged = { file: File; originalSize: number; compressed: boolean };

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StageDocuments({
  stageId,
  documents,
  canManage,
  suggestions,
  maxBytes,
}: {
  stageId: string;
  documents: Doc[];
  canManage: boolean;
  suggestions: string[];
  maxBytes: number;
}) {
  const t = useTranslations();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("");
  // Add flow: a picked file is staged (and images compressed) behind an explicit
  // "Add" button — nothing uploads until the user confirms.
  const [staged, setStaged] = useState<Staged | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0); // bump to reset the FileInput after a successful add
  const uncategorized = t("projects.stageDocs.uncategorized");
  const dlId = `folders-${stageId}`;

  // Group documents by folder: named folders A→Z first, the "uncategorized" bucket last.
  const groups = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of documents) {
      const key = (d.category ?? "").trim();
      const arr = map.get(key);
      if (arr) arr.push(d);
      else map.set(key, [d]);
    }
    const out = [...map.entries()]
      .filter(([k]) => k !== "")
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, docs]) => ({ key: k, name: k, docs }));
    const loose = map.get("");
    if (loose && loose.length) out.push({ key: "", name: uncategorized, docs: loose });
    return out;
  }, [documents, uncategorized]);

  // Every folder name that exists — powers the chips, the datalist and the move menu.
  const folderNames = useMemo(() => {
    const set = new Set<string>(suggestions);
    for (const d of documents) if (d.category) set.add(d.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [documents, suggestions]);

  // Pick (or drop) a file → stage it. Big raster images are re-rendered smaller
  // client-side so they never hit the wire (or the server) at full size.
  async function onFileChange(file: File | null) {
    if (!file) {
      setStaged(null);
      return;
    }
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
      case "file_too_large":
        return t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) });
      case "file_empty":
        return t("projects.stageDocs.emptyFile");
      case "ext_forbidden":
        return t("projects.stageDocs.forbiddenType");
      default:
        return t("projects.stageDocs.uploadError");
    }
  }

  async function onAdd() {
    if (!staged || uploading || preparing) return;
    if (staged.file.size > maxBytes) {
      toast.error(t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) }));
      return;
    }
    setUploading(true);
    try {
      const qs = new URLSearchParams({ stageId, name: staged.file.name });
      if (category.trim()) qs.set("category", category.trim());
      const res = await fetch(`/api/files/stage-docs?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": staged.file.type || "application/octet-stream" },
        body: staged.file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(errorMessage(body.error ?? ""));
        return;
      }
      // Keep the folder selected so several files can be filed in a row; reset the picker.
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

  function move(id: string, value: string) {
    start(async () => {
      await setStageDocumentCategory(id, value || null);
    });
  }

  const tooBig = !!staged && staged.file.size > maxBytes;
  const busy = preparing || uploading;

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
                  <li
                    key={d.id}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 sm:gap-3"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" title={d.fileName}>
                        {d.fileName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {humanSize(d.fileSize)}
                        {d.uploaderName ? ` · ${d.uploaderName}` : ""}
                        {` · ${formatDate(d.uploadedAt as Date)}`}
                      </p>
                    </div>
                    {canManage && folderNames.length > 0 && (
                      <div className="relative shrink-0">
                        <Button variant="ghost" size="icon-sm" tabIndex={-1} aria-hidden title={t("projects.stageDocs.move")}>
                          <FolderInput className="size-4" />
                        </Button>
                        <select
                          aria-label={t("projects.stageDocs.move")}
                          value={d.category ?? ""}
                          disabled={pending}
                          onChange={(e) => move(d.id, e.target.value)}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        >
                          <option value="">{uncategorized}</option>
                          {folderNames.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Button asChild variant="ghost" size="icon-sm" title={t("common.download")}>
                      <a href={d.fileUrl} download>
                        <Download className="size-4" />
                      </a>
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        aria-label={t("common.delete")}
                        onClick={() => start(async () => { await removeStageDocument(d.id); })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {canManage && (
        <div className="space-y-2.5 rounded-xl border border-dashed border-[var(--border-strong)] p-3">
          <div className="space-y-2">
            <label htmlFor={`cat-${stageId}`} className="block text-xs font-semibold text-[var(--muted)]">
              {t("projects.stageDocs.folder")}
            </label>
            {folderNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {folderNames.map((f) => {
                  const active = category.trim() === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCategory(active ? "" : f)}
                      className={
                        "rounded-lg border border-dashed px-2.5 py-1 text-xs font-semibold transition-colors " +
                        (active
                          ? "border-[var(--primary)] text-[var(--primary)]"
                          : "border-[var(--border-strong)] text-[var(--muted)] hover:text-[var(--foreground)]")
                      }
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              id={`cat-${stageId}`}
              list={dlId}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={120}
              placeholder={t("projects.stageDocs.folderPlaceholder")}
              className="h-10 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none"
            />
            <datalist id={dlId}>
              {folderNames.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>

          <FileInput key={pickerKey} ref={fileRef} onFileChange={onFileChange} disabled={busy} />

          {/* Staged-file feedback: final size + a note when we shrank an image. */}
          {preparing && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Loader2 className="size-3.5 animate-spin" />
              {t("projects.stageDocs.preparing")}
            </p>
          )}
          {staged && !preparing && (
            <p className={"text-xs " + (tooBig ? "text-[var(--danger)]" : "text-[var(--muted)]")}>
              {staged.compressed
                ? t("projects.stageDocs.compressedNote", {
                    from: humanSize(staged.originalSize),
                    to: humanSize(staged.file.size),
                  })
                : humanSize(staged.file.size)}
              {tooBig ? ` · ${t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) })}` : ""}
            </p>
          )}

          <p className="text-xs text-[var(--muted)]">
            {t("projects.stageDocs.folderHint", { folder: category.trim() || uncategorized })}
          </p>
          <p className="text-xs text-[var(--muted)]">{t("projects.stageDocs.sizeHint", { max: humanSize(maxBytes) })}</p>

          <Button type="button" onClick={onAdd} disabled={!staged || busy || tooBig} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("projects.stageDocs.uploading")}
              </>
            ) : (
              <>
                <Plus className="size-4" />
                {t("common.add")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
