"use client";
import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  IconFolder as Folder,
  IconPhoto as Photo,
  IconFileText as FileText,
  IconDownload as Download,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const isImage = (m: string | null) => !!m && m.startsWith("image/");

export function StudioDocumentsView({ documents }: { documents: Doc[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const uncategorized = t("projects.stageDocs.uncategorized");

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
    if (loose?.length) out.push({ key: "", name: uncategorized, docs: loose });
    return out;
  }, [documents, uncategorized]);

  if (documents.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{t("projects.studioFiles.empty")}</p>;
  }

  return (
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
  );
}
