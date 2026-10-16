"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconDownload as Download,
  IconFileText as FileText,
  IconFileTypeDocx as FileDocx,
  IconSearch as Search,
  IconTrash as Trash2,
  IconLoader2 as Loader2,
} from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/dates";
import { canDeleteInternalDoc, isWordFile, matchesQuery, ymdToDots } from "@/lib/internal-docs/logic";
import { getInternalDocWordLink, removeInternalDocument } from "@/server/actions/internal-docs";

export type InternalDocItem = {
  id: string;
  title: string;
  docNumber: string | null;
  docDate: string | null;
  fileName: string;
  fileSize: number | null;
  uploadedAt: Date | string;
  uploadedByUserId: string | null;
  uploaderName: string | null;
};

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Bildirgilar / buyruqlar roʻyxati: qidiruv, har bir hujjat uchun "Wordda ochish" (Word
 * fayllari), "Yuklab olish" (barchasi) va muallif yoki rahbariyat uchun "Oʻchirish".
 * Metamaʼlumot oddiy matn (plashka emas): raqam, sana, hajm, kim yuklagan.
 */
export function InternalDocsList({ docs, viewer }: { docs: InternalDocItem[]; viewer: { id: string; position: string } }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => docs.filter((d) => matchesQuery(d, query)), [docs, query]);

  function openInWord(id: string) {
    setBusyId(id);
    start(async () => {
      try {
        const r = await getInternalDocWordLink(id);
        if (!r.ok) {
          toast.error(t("internalDocs.wordOpenError"));
          return;
        }
        // Office URI: brauzer Word'ni ishga tushiradi, Word faylni imzolangan manzildan oʻzi oladi.
        window.location.href = r.url;
      } catch {
        toast.error(t("internalDocs.wordOpenError"));
      } finally {
        setBusyId(null);
      }
    });
  }

  async function remove(d: InternalDocItem) {
    if (!(await confirm({ description: t("internalDocs.confirmDelete", { title: d.title }), tone: "danger" }))) return;
    start(async () => {
      try {
        const r = await removeInternalDocument(d.id);
        if (!r.ok) {
          toast.error(t(`common.actionErrors.${r.error}` as "common.actionErrors.not_found"));
          return;
        }
        toast.success(t("internalDocs.deleted"));
        router.refresh();
      } catch {
        toast.error(t("common.error"));
      }
    });
  }

  if (docs.length === 0) {
    return (
      <Card className="px-5 py-10 text-center sm:px-6">
        <FileText className="mx-auto size-8 text-[var(--ink-3)]" aria-hidden />
        <p className="mt-3 t-body font-medium text-[var(--ink)]">{t("internalDocs.empty")}</p>
        <p className="mt-1 t-small text-[var(--ink-3)]">{t("internalDocs.emptyHint")}</p>
      </Card>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full min-w-0 sm:max-w-md">
          <span className="sr-only">{t("common.search")}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("internalDocs.searchPlaceholder")}
            className="t-body h-12 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-11 pr-4 text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--focus)] focus:outline-none"
          />
        </label>
        <p className="t-small text-[var(--ink-3)]" aria-live="polite">
          {t("internalDocs.count", { count: shown.length })}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="t-body text-[var(--ink-3)]">{t("internalDocs.noMatches")}</p>
      ) : (
        <Card bare className="px-5 sm:px-6">
          <Rows>
            {shown.map((d) => {
              const word = isWordFile(d.fileName);
              const meta = [
                d.docNumber ? t("internalDocs.numberPrefix", { number: d.docNumber }) : null,
                d.docDate ? ymdToDots(d.docDate) : null,
                humanSize(d.fileSize) || null,
                d.uploaderName,
                formatDate(d.uploadedAt as Date, locale),
              ].filter(Boolean);
              const canDelete = canDeleteInternalDoc(viewer, d.uploadedByUserId);
              const downloadHref = `/api/internal-docs/${d.id}/download`;
              return (
                <Row key={d.id}>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start gap-3">
                      {word ? (
                        <FileDocx className="mt-0.5 size-[22px] shrink-0 text-[var(--tint)]" aria-hidden />
                      ) : (
                        <FileText className="mt-0.5 size-[22px] shrink-0 text-[var(--ink-3)]" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={downloadHref}
                          className="block truncate text-[0.9375rem] font-medium text-[var(--ink)] hover:text-[var(--tint)]"
                          title={d.fileName}
                        >
                          {d.title}
                        </a>
                        <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">{meta.join(", ")}</p>
                      </div>
                      <a
                        href={downloadHref}
                        aria-label={t("common.download")}
                        title={t("common.download")}
                        className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                      >
                        <Download className="size-[18px]" />
                      </a>
                      {canDelete && (
                        <button
                          type="button"
                          disabled={pending}
                          aria-label={t("common.delete")}
                          title={t("common.delete")}
                          onClick={() => remove(d)}
                          className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                        >
                          <Trash2 className="size-[18px]" />
                        </button>
                      )}
                    </div>
                    {word && (
                      <div className="mt-2 pl-[34px]">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending && busyId === d.id}
                          onClick={() => openInWord(d.id)}
                          title={t("internalDocs.openInWordHint")}
                        >
                          {pending && busyId === d.id ? <Loader2 className="size-4 animate-spin" /> : <FileDocx className="size-4" />}
                          {t("internalDocs.openInWord")}
                        </Button>
                      </div>
                    )}
                  </div>
                </Row>
              );
            })}
          </Rows>
        </Card>
      )}
    </div>
  );
}
