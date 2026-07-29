"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Download, Trash2, FileText, Plus, Loader2, BarChart3, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { removeProjectDocument } from "@/server/actions/projects";
import { compressImage } from "@/lib/images/compress";
import { formatDate } from "@/lib/dates";

type Doc = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  uploadedAt: Date | string;
  uploaderName: string | null;
};
type Kind = "tahlil" | "xalqaro_tajriba";
type Staged = { file: File; originalSize: number; compressed: boolean };

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Each bucket gets its own colourway + icon so the two panels read as distinct,
// on-brand blocks that draw the eye.
const THEME: Record<Kind, { grad: string; btn: string; soft: string; Icon: typeof BarChart3 }> = {
  tahlil: {
    grad: "from-[#6366f1] to-[#8b5cf6]",
    btn: "bg-[#6366f1] hover:bg-[#5457e0] text-white",
    soft: "bg-[var(--primary-soft)] text-[var(--primary)]",
    Icon: BarChart3,
  },
  xalqaro_tajriba: {
    grad: "from-[#0ea5e9] to-[#06b6d4]",
    btn: "bg-[#0891b2] hover:bg-[#0e7490] text-white",
    soft: "bg-[#06b6d4]/12 text-[#0891b2]",
    Icon: Globe2,
  },
};

function DocPanel({
  projectId,
  kind,
  title,
  docs,
  canManage,
  maxBytes,
}: {
  projectId: string;
  kind: Kind;
  title: string;
  docs: Doc[];
  canManage: boolean;
  maxBytes: number;
}) {
  const t = useTranslations();
  const router = useRouter();
  const theme = THEME[kind];
  const Icon = theme.Icon;
  const [pending, start] = useTransition();
  const [staged, setStaged] = useState<Staged | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

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

  async function onAdd() {
    if (!staged || uploading || preparing) return;
    if (staged.file.size > maxBytes) {
      toast.error(t("projects.stageDocs.tooLarge", { max: humanSize(maxBytes) }));
      return;
    }
    setUploading(true);
    try {
      const qs = new URLSearchParams({ projectId, kind, name: staged.file.name });
      const res = await fetch(`/api/files/project-docs?${qs.toString()}`, {
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

  const tooBig = !!staged && staged.file.size > maxBytes;
  const busy = preparing || uploading;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]">
      {/* Gradient header */}
      <div className={`flex items-center gap-3 bg-gradient-to-r ${theme.grad} px-4 py-3.5 text-white`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="size-5" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight">{title}</h3>
        <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold tabular-nums">{docs.length}</span>
      </div>

      <div className="space-y-3 p-4">
        {docs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] py-5 text-center text-sm text-[var(--muted)]">
            {t("projects.projectDocs.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${theme.soft}`}>
                  <FileText className="size-4" />
                </span>
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
                    onClick={() => start(async () => { await removeProjectDocument(d.id); })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="space-y-2.5 pt-1">
            <FileInput key={pickerKey} onFileChange={onFileChange} disabled={busy} />

            {preparing && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Loader2 className="size-3.5 animate-spin" />
                {t("projects.stageDocs.preparing")}
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

            <Button type="button" onClick={onAdd} disabled={!staged || busy || tooBig} className={`w-full ${theme.btn}`}>
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
    </div>
  );
}

export function ProjectDocsPanels({
  projectId,
  canManage,
  maxBytes,
  tahlil,
  xalqaro,
}: {
  projectId: string;
  canManage: boolean;
  maxBytes: number;
  tahlil: Doc[];
  xalqaro: Doc[];
}) {
  const t = useTranslations();
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
      <DocPanel projectId={projectId} kind="tahlil" title={t("projects.projectDocs.tahlilTitle")} docs={tahlil} canManage={canManage} maxBytes={maxBytes} />
      <DocPanel projectId={projectId} kind="xalqaro_tajriba" title={t("projects.projectDocs.xalqaroTitle")} docs={xalqaro} canManage={canManage} maxBytes={maxBytes} />
    </div>
  );
}
