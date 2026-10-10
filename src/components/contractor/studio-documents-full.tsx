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
import { Card } from "@/components/ui-biib/Card";
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
      <div className="flex flex-col items-center justify-center py-12 text-[var(--ink-3)]">
        <FileIcon className="mb-2 size-10 opacity-40" aria-hidden />
        <p className="t-small font-medium">{t("contractors.detail.docsEmpty")}</p>
      </div>
    );
  }

  return (
    <Card bare className="px-5 py-2 sm:px-6">
      <div className="divide-y divide-[var(--line)]">
        {byProject.map((p) => (
          <section key={p.projectId} className="py-5 first:pt-3 last:pb-3">
            <div className="flex items-baseline gap-2">
              <h3 className="t-label text-[var(--ink)]">{p.projectName}</h3>
              <span className="t-micro tabular-nums text-[var(--ink-3)]">{p.totalDocs}</span>
            </div>
            {p.folders.map((f) => (
              <div key={f.name} className="mt-3">
                <p className="flex items-center gap-1.5 t-micro font-semibold text-[var(--ink-3)]">
                  <Folder className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{f.name}</span>
                  <span className="tabular-nums">{f.docs.length}</span>
                </p>
                <ul className="mt-1 divide-y divide-[var(--line)]">
                  {f.docs.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-2">
                      <span className="shrink-0 text-[var(--ink-3)]">
                        {isImage(d.fileMimeType) ? <Photo className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--ink)]" title={d.fileName}>{d.fileName}</p>
                        {humanSize(d.fileSize) && <p className="t-micro text-[var(--ink-3)]">{humanSize(d.fileSize)}</p>}
                      </div>
                      <Button asChild variant="ghost" size="icon-sm" title={t("common.download")}>
                        <a href={d.fileUrl} download><Download className="size-4" aria-hidden /></a>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Card>
  );
}
