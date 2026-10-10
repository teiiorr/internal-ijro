"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPlus as Plus, IconLoader2 as Loader2, IconLink as Link2 } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { NativeSelect } from "@/components/staff/normative-ack/native-select";
import { compressImage } from "@/lib/images/compress";
import { addNormativeLink } from "@/server/actions/normative";
import { cn } from "@/lib/utils";

type Staged = { file: File; originalSize: number; compressed: boolean };
type Mode = "file" | "link";

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "Hujjat qoʻshish" — sahifa sarlavhasidagi asosiy amal. Oyna (sheet) ichida Fayl / Havola
 * oʻtkagichi, papka maydoni va bitta dropzone. Oyna shishadek — ichi tekis (ramka ichida ramka yoʻq).
 */
export function AddNormativeDoc({ folderNames, maxBytes }: { folderNames: string[]; maxBytes: number }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("file");
  const [pending, start] = useTransition();

  const [folder, setFolder] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const uncategorized = t("projects.stageDocs.uncategorized");
  const tooBig = !!staged && staged.file.size > maxBytes;
  const busy = preparing || uploading;

  function reset() {
    setMode("file");
    setFolder("");
    setStaged(null);
    setLinkTitle("");
    setLinkUrl("");
    setPickerKey((k) => k + 1);
  }

  function onOpenChange(next: boolean) {
    if (next) reset();
    setOpen(next);
  }

  async function onFileChange(file: File | null) {
    if (!file) return setStaged(null);
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

  async function onAddFile() {
    if (!staged || uploading || preparing) return;
    if (staged.file.size > maxBytes) {
      toast.error(t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) }));
      return;
    }
    setUploading(true);
    try {
      const qs = new URLSearchParams({ name: staged.file.name });
      if (folder.trim()) qs.set("folder", folder.trim());
      const res = await fetch(`/api/files/normative-docs?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": staged.file.type || "application/octet-stream" },
        body: staged.file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(errorMessage(body.error ?? ""));
        return;
      }
      toast.success(t("projects.stageDocs.added"));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t("projects.stageDocs.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function onAddLink() {
    const title = linkTitle.trim();
    let url = linkUrl.trim();
    if (!title || !url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // protokolsiz kiritilsa ham qabul qilamiz
    start(async () => {
      try {
        await addNormativeLink({ title, url, folder: folder.trim() || null });
        toast.success(t("projects.stageDocs.added"));
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("normative.linkError"));
      }
    });
  }

  const inputClass =
    "t-body h-12 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--focus)] focus:outline-none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("projects.projectDocs.addFile")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{t("projects.projectDocs.addFile")}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          {/* Fayl / Havola oʻtkagichi — tekis, surface-2 trekda */}
          <div role="radiogroup" aria-label={t("common.file")} className="grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-[var(--surface-2)] p-1">
            {(["file", "link"] as const).map((md) => (
              <button
                key={md}
                type="button"
                role="radio"
                aria-checked={mode === md}
                onClick={() => setMode(md)}
                className={cn(
                  "min-h-10 rounded-[calc(var(--radius-control)-4px)] px-3 text-sm font-semibold transition-colors",
                  mode === md
                    ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                )}
              >
                {md === "file" ? t("common.file") : t("normative.addLink")}
              </button>
            ))}
          </div>

          {/* Papka — ikkala rejim uchun umumiy maydon */}
          <div className="space-y-2">
            <label htmlFor="normative-folder" className="t-label text-[var(--ink)]">
              {t("projects.stageDocs.folder")}
            </label>
            <NativeSelect
              id="normative-folder"
              value={folderNames.includes(folder) ? folder : ""}
              onChange={(e) => setFolder(e.target.value)}
            >
              <option value="">{t("projects.stageDocs.folderPlaceholder")}</option>
              {folderNames.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </NativeSelect>
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              maxLength={120}
              placeholder={t("projects.stageDocs.newFolderPlaceholder")}
              className={inputClass}
            />
          </div>

          {mode === "file" ? (
            <div className="space-y-2.5">
              <FileInput key={pickerKey} onFileChange={onFileChange} disabled={busy} />
              {preparing && (
                <p className="flex items-center gap-1.5 t-small text-[var(--ink-3)]">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("projects.stageDocs.preparing")}
                </p>
              )}
              {staged && !preparing && (
                <p className={cn("t-small", tooBig ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
                  {staged.compressed
                    ? t("projects.stageDocs.compressedNote", { from: humanSize(staged.originalSize), to: humanSize(staged.file.size) })
                    : humanSize(staged.file.size)}
                  {tooBig ? `, ${t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) })}` : ""}
                </p>
              )}
              <p className="t-small text-[var(--ink-3)]">{t("projects.stageDocs.folderHint", { folder: folder.trim() || uncategorized })}</p>
              <p className="t-small text-[var(--ink-3)]">{t("projects.stageDocs.sizeHint", { max: humanSize(maxBytes) })}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                maxLength={255}
                placeholder={t("normative.linkTitlePlaceholder")}
                className={inputClass}
              />
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                inputMode="url"
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={busy || pending} className="w-full sm:w-auto">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            {mode === "file" ? (
              <Button type="button" onClick={onAddFile} disabled={!staged || busy || tooBig} className="w-full sm:w-auto">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {uploading ? t("projects.stageDocs.uploading") : t("common.add")}
              </Button>
            ) : (
              <Button type="button" onClick={onAddLink} disabled={pending || !linkTitle.trim() || !linkUrl.trim()} className="w-full sm:w-auto">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                {t("normative.addLink")}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
