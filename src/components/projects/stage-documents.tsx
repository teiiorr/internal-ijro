"use client";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { IconDownload as Download, IconTrash as Trash2, IconFileText as FileText, IconFolder as Folder, IconFolderShare as FolderInput, IconPlus as Plus, IconLoader2 as Loader2 } from "@tabler/icons-react";
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
  const locale = useLocale();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("");
  // Qöşiş jarayoni: tanlangan fayl "Qöşiş" tugmasi ortida tayyorlab qöyiladi
  // (rasmlar siqiladi) — foydalanuvçi tasdiqlamaguncha heç narsa yuklanmaydi.
  const [staged, setStaged] = useState<Staged | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0); // muvaffaqiyatli qöşilgandan söng FileInput ni tozalash uçun oşiramiz
  const uncategorized = t("projects.stageDocs.uncategorized");

  // Hujjatlarni papkalar böyicha guruhlaymiz: avval nomlangan papkalar A→Z, oxirida "kategoriyasiz" bölimi.
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

  // Mavjud barcha papka nomlari — çiplar, datalist va köçiriş menyusini ta'minlaydi.
  const folderNames = useMemo(() => {
    const set = new Set<string>(suggestions);
    for (const d of documents) if (d.category) set.add(d.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [documents, suggestions]);

  // Faylni tanlash (yoki taşlash) → uni tayyorlab qöyamiz. Katta rasterli rasmlar mijoz
  // tomonida kiçikroq ölçamda qayta çiziladi — şunda ular töliq ölçamda tarmoqqa (yoki serverga) tuşmaydi.
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
      // Papkani tanlangan holida qoldiramiz — şunda ketma-ket bir neça faylni joylaştirish mumkin; tanlagiçni tozalaymiz.
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
    <div className="space-y-5">
      {documents.length === 0 ? (
        <p className="t-small text-[var(--ink-3)]">{t("projects.stageDocs.empty")}</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key || "__loose__"}>
              <div className="flex items-center gap-2">
                <Folder className="size-4 shrink-0 text-[var(--ink-3)]" />
                <span className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">{g.name}</span>
                <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{g.docs.length}</span>
              </div>
              <ul className="mt-2 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {g.docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 py-3 sm:gap-3">
                    <FileText className="size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--ink)]" title={d.fileName}>
                        {d.fileName}
                      </p>
                      <p className="truncate t-micro text-[var(--ink-3)]">
                        {humanSize(d.fileSize)}
                        {d.uploaderName ? `, ${d.uploaderName}` : ""}
                        {`, ${formatDate(d.uploadedAt as Date, locale)}`}
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
        <div className="space-y-2.5 border-t border-[var(--line)] pt-4">
          <div className="space-y-2">
            <label htmlFor={`cat-${stageId}`} className="block t-label text-[var(--ink-2)]">
              {t("projects.stageDocs.folder")}
            </label>
            <select
              id={`cat-${stageId}`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full appearance-none rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] px-3 pr-8 text-sm font-medium text-[var(--ink)] transition-colors focus:border-[var(--line-strong)] focus:outline-none"
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
              className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--ink)] transition-colors focus:border-[var(--line-strong)] focus:outline-none"
            />
          </div>

          <FileInput key={pickerKey} ref={fileRef} onFileChange={onFileChange} disabled={busy} />

          {/* Tayyorlangan fayl haqida ma'lumot: yakuniy ölçam va rasm siqilgan bölsa izoh. */}
          {preparing && (
            <p className="flex items-center gap-1.5 t-micro text-[var(--ink-3)]">
              <Loader2 className="size-3.5 animate-spin" />
              {t("projects.stageDocs.preparing")}
            </p>
          )}
          {staged && !preparing && (
            <p className={"t-micro " + (tooBig ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
              {staged.compressed
                ? t("projects.stageDocs.compressedNote", {
                    from: humanSize(staged.originalSize),
                    to: humanSize(staged.file.size),
                  })
                : humanSize(staged.file.size)}
              {tooBig ? `, ${t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) })}` : ""}
            </p>
          )}

          <p className="t-micro text-[var(--ink-3)]">
            {t("projects.stageDocs.folderHint", { folder: category.trim() || uncategorized })}
          </p>
          <p className="t-micro text-[var(--ink-3)]">{t("projects.stageDocs.sizeHint", { max: humanSize(maxBytes) })}</p>

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
