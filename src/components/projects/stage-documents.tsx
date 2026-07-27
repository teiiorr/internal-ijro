"use client";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Download, Trash2, FileText } from "lucide-react";
import { attachStageDocument, removeStageDocument } from "@/server/actions/stages";
import { formatDate } from "@/lib/dates";

type Doc = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  uploadedAt: Date | string;
  uploaderName: string | null;
};

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StageDocuments({ stageId, documents, canManage }: { stageId: string; documents: Doc[]; canManage: boolean }) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    start(async () => {
      await attachStageDocument(stageId, f);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
            <div className="size-9 rounded-lg bg-[var(--primary-soft)] grid place-items-center text-[var(--primary)] shrink-0">
              <FileText className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" title={d.fileName}>{d.fileName}</p>
              <p className="text-xs text-[var(--muted)] truncate">
                {humanSize(d.fileSize)}
                {d.uploaderName ? ` · ${d.uploaderName}` : ""}
                {` · ${formatDate(d.uploadedAt as Date)}`}
              </p>
            </div>
            <Button asChild variant="ghost" size="icon-sm" title={t("common.download")}>
              <a href={d.fileUrl} download><Download className="size-4" /></a>
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
        {documents.length === 0 && <li className="text-sm text-[var(--muted)]">{t("projects.stageDocs.empty")}</li>}
      </ul>
      {canManage && <FileInput ref={fileRef} onChange={onPick} disabled={pending} />}
    </div>
  );
}
