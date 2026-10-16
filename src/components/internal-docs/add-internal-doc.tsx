"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPlus as Plus, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import type { InternalDocKind } from "@/lib/db/tables/internal-documents";
import { cn } from "@/lib/utils";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Bugungi sana (Toshkent vaqti) YYYY-MM-DD koʻrinishida — sana maydonining boshlangʻich qiymati. */
function todayTashkent(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

/**
 * "Hujjat qoʻshish": fayl + ixtiyoriy nom, raqam va sana. Fayl /api/files/internal-docs ga
 * oqim sifatida yuboriladi (katta fayl ham xotirani toʻldirmaydi). Har qanday format; Word
 * fayllarini keyin roʻyxatdan toʻgʻridan-toʻgʻri Wordda ochish mumkin.
 */
export function AddInternalDoc({ kind, maxBytes }: { kind: InternalDocKind; maxBytes: number }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const tooBig = !!file && file.size > maxBytes;

  function onOpenChange(next: boolean) {
    if (next) {
      setFile(null);
      setTitle("");
      setNumber("");
      setDate(todayTashkent());
      setPickerKey((k) => k + 1);
    }
    setOpen(next);
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

  async function onSubmit() {
    if (!file || uploading) return;
    if (tooBig) {
      toast.error(errorMessage("file_too_large"));
      return;
    }
    setUploading(true);
    try {
      const qs = new URLSearchParams({ kind, name: file.name });
      if (title.trim()) qs.set("title", title.trim());
      if (number.trim()) qs.set("number", number.trim());
      if (date) qs.set("date", date);
      const res = await fetch(`/api/files/internal-docs?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(errorMessage(body.error ?? ""));
        return;
      }
      toast.success(t("internalDocs.uploaded"));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(errorMessage(""));
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "t-body h-12 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--focus)] focus:outline-none";
  const dialogTitle = kind === "bildirgi" ? t("internalDocs.newBildirgi") : t("internalDocs.newBuyruq");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("internalDocs.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          <div className="space-y-2.5">
            <FileInput key={pickerKey} onFileChange={setFile} disabled={uploading} />
            {file && (
              <p className={cn("t-small", tooBig ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
                {humanSize(file.size)}
                {tooBig ? `, ${t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) })}` : ""}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="internal-doc-title" className="t-label text-[var(--ink)]">
              {t("internalDocs.fieldTitle")}
            </label>
            <input
              id="internal-doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              placeholder={t("internalDocs.titlePlaceholder")}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <label htmlFor="internal-doc-number" className="t-label text-[var(--ink)]">
                {t("internalDocs.fieldNumber")}
              </label>
              <input
                id="internal-doc-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                maxLength={60}
                placeholder={t("internalDocs.numberPlaceholder")}
                className={inputClass}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label htmlFor="internal-doc-date" className="t-label text-[var(--ink)]">
                {t("internalDocs.fieldDate")}
              </label>
              <input
                id="internal-doc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <p className="t-small text-[var(--ink-3)]">{t("projects.stageDocs.sizeHint", { max: humanSize(maxBytes) })}</p>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={uploading} className="w-full sm:w-auto">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="button" onClick={onSubmit} disabled={!file || uploading || tooBig} className="w-full sm:w-auto">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {uploading ? t("projects.stageDocs.uploading") : t("common.add")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
