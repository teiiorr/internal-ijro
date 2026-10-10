"use client";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import {
  IconDownload as Download,
  IconFileText as FileText,
  IconFolderShare as FolderInput,
  IconLink as Link2,
  IconExternalLink as ExternalLink,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import { removeNormativeDocument, setNormativeDocumentFolder } from "@/server/actions/normative";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { RegistryFilters } from "@/components/staff/normative-ack/registry-filters";
import { DocMetaDialog } from "@/components/staff/normative-ack/doc-meta-dialog";
import { AckRequestDialog } from "@/components/staff/normative-ack/ack-request-dialog";
import { AckProgress } from "@/components/staff/normative-ack/ack-progress";
import {
  DEFAULT_REGISTRY_FILTER,
  canEditDocMeta,
  filterRegistry,
  isDocType,
  registryYears,
  ymdToDots,
  type AckComposerOptions,
  type DocMeta,
  type RegistryFilter,
} from "@/components/staff/normative-ack/logic";

type Doc = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  category: string | null; // = papka
  isLink: boolean;
  uploadedAt: Date | string;
  uploaderName: string | null;
  /** Reyestr: yuklovchi (Rekvizitlar huquqi uchun). */
  uploadedByUserId?: string | null;
  /** Reyestr rekvizitlari (normative-ack); 0031 qoʻllanmagan boʻlsa null. */
  meta?: DocMeta | null;
};
type AckSummary = { requestId: string; total: number; acknowledged: number; deadline: string };

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Meʼyoriy reyestr. Har papka — BIIB seksiya (sarlavha + sarhisob), ichida tekis karta va
 * ajratuvchi qatorlar (quti emas). Hujjat nomi — havola (ochadi/yuklaydi); rekvizit matni
 * oddiy --ink-2 matn; bekor qilingan hujjat — xotirjam Status; amallar qatorlari tekis.
 */
export function NormativeDocuments({
  documents,
  canManage,
  currentUserPosition,
  currentUserId,
  canSendAck = false,
  ackSummaries,
  allDocs,
  ackOptions,
  today,
}: {
  documents: Doc[];
  canManage: boolean;
  maxBytes?: number;
  currentUserPosition?: string;
  currentUserId?: string;
  canSendAck?: boolean;
  ackSummaries?: Record<string, AckSummary[]>;
  allDocs?: { id: string; fileName: string }[];
  /** "Tanishtirishga yuborish" dialog options (departments / positions / people within my scope). */
  ackOptions?: AckComposerOptions;
  /** Tashkent YYYY-MM-DD from the server (earliest acknowledgement deadline). */
  today?: string;
}) {
  const t = useTranslations();
  const tn = useTranslations("staffX.normativeAck");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const uncategorized = t("projects.stageDocs.uncategorized");
  const [filter, setFilter] = useState<RegistryFilter>(DEFAULT_REGISTRY_FILTER);
  const [flashId, setFlashId] = useState<string | null>(null);

  const filtered = useMemo(() => filterRegistry(documents, filter), [documents, filter]);
  const years = useMemo(() => registryYears(documents), [documents]);
  const docOptions = useMemo(
    () => allDocs ?? documents.map((d) => ({ id: d.id, fileName: d.fileName })),
    [allDocs, documents]
  );
  const docNames = useMemo(() => new Map(documents.map((d) => [d.id, d.fileName])), [documents]);
  /** old document id → the document that replaces it (for the "Quyidagi hujjat oʻrniga" select). */
  const supersedesOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of documents) {
      const newer = d.meta?.supersededById;
      if (newer && !map.has(newer)) map.set(newer, d.id);
    }
    return map;
  }, [documents]);
  const me = { id: currentUserId, position: currentUserPosition };
  const canAck = canSendAck && !!ackOptions && !!today;

  /** "Yangi tahriri →": clear the filters so the target is rendered, then scroll to it and flash it. */
  function goToDoc(id: string) {
    setFilter(DEFAULT_REGISTRY_FILTER);
    setFlashId(id);
    window.setTimeout(() => {
      document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 2200);
  }

  const groups = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of filtered) {
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
  }, [filtered, uncategorized]);

  const folderNames = useMemo(() => {
    const set = new Set<string>();
    for (const d of documents) if (d.category) set.add(d.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [documents]);

  function move(id: string, value: string) {
    start(async () => {
      await setNormativeDocumentFolder(id, value || null);
    });
  }

  if (documents.length === 0) {
    return <p className="t-body text-[var(--ink-3)]">{t("projects.stageDocs.empty")}</p>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
      <RegistryFilters value={filter} onChange={setFilter} years={years} shown={filtered.length} total={documents.length} />

      {filtered.length === 0 ? (
        <p className="t-body text-[var(--ink-3)]">{tn("noMatches")}</p>
      ) : (
        groups.map((g) => (
          <Section key={g.key || "__loose__"} title={g.name} meta={g.docs.length} headingLevel={3}>
            <Card bare className="px-5 sm:px-6">
              <Rows>
                {g.docs.map((d) => {
                  const rm = d.meta ?? null;
                  const repealed = rm?.status === "repealed";
                  const newerId = repealed && rm?.supersededById && docNames.has(rm.supersededById) ? rm.supersededById : null;
                  const editMeta = canEditDocMeta(me, d.uploadedByUserId);
                  const summaries = ackSummaries?.[d.id] ?? [];
                  const hasActions = editMeta || canAck || summaries.length > 0;
                  // Rekvizit — oddiy matn (quti/plashka emas): tur, №, sana, kim chiqargan.
                  const reqParts = rm
                    ? [
                        isDocType(rm.docType) ? tn(`type.${rm.docType}`) : null,
                        rm.docNumber ? `№ ${rm.docNumber}` : null,
                        rm.docDate ? ymdToDots(rm.docDate) : null,
                        rm.issuedBy || null,
                      ].filter(Boolean)
                    : [];
                  const fileMeta = `${humanSize(d.fileSize)}${d.uploaderName ? `, ${d.uploaderName}` : ""}, ${formatDate(d.uploadedAt as Date, locale)}`;
                  return (
                    <Row key={d.id}>
                      <div
                        id={`doc-${d.id}`}
                        className={cn(
                          "min-w-0 flex-1 scroll-mt-24 rounded-[var(--radius-s)] transition-[opacity,box-shadow] duration-300",
                          repealed && flashId !== d.id && "opacity-60",
                          flashId === d.id && "shadow-[0_0_0_2px_var(--tint)]"
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          {d.isLink ? (
                            <Link2 className="mt-0.5 size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
                          ) : (
                            <FileText className="mt-0.5 size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
                          )}
                          <div className="min-w-0 flex-1">
                            <a
                              href={d.fileUrl}
                              {...(d.isLink ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                              className="block truncate text-[0.9375rem] font-medium text-[var(--ink)] hover:text-[var(--tint)]"
                              title={d.fileName}
                            >
                              {d.fileName}
                            </a>
                            <p className="mt-0.5 truncate t-small text-[var(--ink-3)]" title={d.isLink ? d.fileUrl : undefined}>
                              {d.isLink ? d.fileUrl : fileMeta}
                            </p>
                          </div>
                          {repealed && (
                            <Status tone="danger" className="mt-0.5 shrink-0">
                              {tn("statusRepealed")}
                            </Status>
                          )}
                          <a
                            href={d.fileUrl}
                            {...(d.isLink ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                            aria-label={d.isLink ? t("common.open") : t("common.download")}
                            title={d.isLink ? t("common.open") : t("common.download")}
                            className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                          >
                            {d.isLink ? <ExternalLink className="size-[18px]" /> : <Download className="size-[18px]" />}
                          </a>
                          {canManage && (
                            <button
                              type="button"
                              disabled={pending}
                              aria-label={t("common.delete")}
                              title={t("common.delete")}
                              onClick={() => start(async () => { await removeNormativeDocument(d.id); })}
                              className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                            >
                              <Trash2 className="size-[18px]" />
                            </button>
                          )}
                        </div>

                        {(reqParts.length > 0 || rm?.summary || newerId) && (
                          <div className="mt-1.5 min-w-0 space-y-1 pl-[30px]">
                            {reqParts.length > 0 && (
                              <p className="truncate t-small text-[var(--ink-2)]">{reqParts.join(", ")}</p>
                            )}
                            {newerId && (
                              <a
                                href={`#doc-${newerId}`}
                                onClick={(e) => { e.preventDefault(); goToDoc(newerId); }}
                                title={docNames.get(newerId)}
                                className="inline-block t-small font-medium text-[var(--tint)] hover:underline"
                              >
                                {tn("newVersion")}
                              </a>
                            )}
                            {rm?.summary && (
                              <p className="line-clamp-2 whitespace-pre-line break-words t-small text-[var(--ink-3)] [overflow-wrap:anywhere]" title={rm.summary}>
                                {rm.summary}
                              </p>
                            )}
                          </div>
                        )}

                        {hasActions && (
                          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 pl-[30px]">
                            {editMeta && (
                              <DocMetaDialog
                                doc={{ id: d.id, fileName: d.fileName, meta: rm }}
                                otherDocs={docOptions}
                                supersedesId={supersedesOf.get(d.id) ?? null}
                              />
                            )}
                            {canAck && ackOptions && today && (
                              <AckRequestDialog documentId={d.id} fileName={d.fileName} options={ackOptions} today={today} />
                            )}
                            {canManage && folderNames.length > 0 && (
                              <div className="relative">
                                <Button variant="ghost" size="sm" tabIndex={-1} aria-hidden>
                                  <FolderInput className="size-4" />
                                  {t("projects.stageDocs.move")}
                                </Button>
                                <select
                                  aria-label={t("projects.stageDocs.move")}
                                  value={d.category ?? ""}
                                  disabled={pending}
                                  onChange={(e) => move(d.id, e.target.value)}
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                >
                                  <option value="">{uncategorized}</option>
                                  {folderNames.map((f) => (<option key={f} value={f}>{f}</option>))}
                                </select>
                              </div>
                            )}
                            {summaries.map((s) => (
                              <AckProgress key={s.requestId} requestId={s.requestId} total={s.total} acknowledged={s.acknowledged} deadline={s.deadline} />
                            ))}
                          </div>
                        )}
                      </div>
                    </Row>
                  );
                })}
              </Rows>
            </Card>
          </Section>
        ))
      )}
    </div>
  );
}
