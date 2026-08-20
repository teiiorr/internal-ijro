"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  IconFolder as Folder,
  IconPhoto as Photo,
  IconFileText as FileText,
  IconDownload as Download,
  IconFile as FileIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

type Doc = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  fileMimeType: string | null;
  category: string | null;
  uploadedAt: Date | string;
  projectId: string;
  projectName: string;
};

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const isImage = (m: string | null) => !!m && m.startsWith("image/");

export function StudioDocumentsFull({ documents }: { documents: Doc[] }) {
  const t = useTranslations();

  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; folders: Map<string, Doc[]> }>();
    for (const d of documents) {
      if (!map.has(d.projectId)) map.set(d.projectId, { name: d.projectName, folders: new Map() });
      const entry = map.get(d.projectId)!;
      const cat = (d.category ?? "").trim() || t("projects.stageDocs.uncategorized");
      if (!entry.folders.has(cat)) entry.folders.set(cat, []);
      entry.folders.get(cat)!.push(d);
    }
    return [...map.entries()].map(([id, { name, folders }]) => ({
      projectId: id,
      projectName: name,
      folders: [...folders.entries()].map(([k, docs]) => ({ name: k, docs })),
      totalDocs: [...folders.values()].reduce((s, d) => s + d.length, 0),
    }));
  }, [documents, t]);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
        <FileIcon className="size-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">{t("contractors.detail.docsEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {byProject.map((p) => (
        <section key={p.projectId} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{p.projectName}</h3>
            <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted)]">
              {p.totalDocs}
            </span>
          </div>
          {p.folders.map((f) => (
            <div key={f.name} className="space-y-1.5 sm:pl-2">
              <div className="flex items-center gap-2">
                <Folder className="size-4 shrink-0 text-[var(--primary)]" />
                <span className="truncate text-xs font-semibold text-[var(--muted)]">{f.name}</span>
                <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--muted)]">
                  {f.docs.length}
                </span>
              </div>
              <ul className="space-y-1.5 sm:pl-6">
                {f.docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                      {isImage(d.fileMimeType) ? <Photo className="size-4" /> : <FileText className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" title={d.fileName}>{d.fileName}</p>
                      <p className="text-xs text-[var(--muted)]">{humanSize(d.fileSize)}</p>
                    </div>
                    <Button asChild variant="ghost" size="icon-sm" title={t("common.download")}>
                      <a href={d.fileUrl} download><Download className="size-4" /></a>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
