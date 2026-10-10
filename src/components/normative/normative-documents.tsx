"use client";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { IconDownload as Download, IconTrash as Trash2, IconFileText as FileText, IconFolder as Folder, IconFolderShare as FolderInput, IconPlus as Plus, IconLoader2 as Loader2, IconChevronUp as ChevronUp, IconLink as Link2, IconExternalLink as ExternalLink } from "@tabler/icons-react";
import { removeNormativeDocument, setNormativeDocumentFolder, addNormativeLink } from "@/server/actions/normative";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/images/compress";
import { formatDate } from "@/lib/dates";
import { StatusTag } from "@/components/ui/status-tag";
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
type Staged = { file: File; originalSize: number; compressed: boolean };

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NormativeDocuments({
  documents,
  canManage,
  maxBytes,
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
  maxBytes: number;
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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [folder, setFolder] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [open, setOpen] = useState(false); // yuklaş formasi standart holda yiğilgan (Tahlil kabi)
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
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
      setStaged(null);
      setPickerKey((k) => k + 1);
      setOpen(false); // muvaffaqiyatli qöşilgach yana yiğamiz
      toast.success(t("projects.stageDocs.added"));
      router.refresh();
    } catch {
      toast.error(t("projects.stageDocs.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function move(id: string, value: string) {
    start(async () => { await setNormativeDocumentFolder(id, value || null); });
  }

  function onAddLink() {
    const title = linkTitle.trim();
    let url = linkUrl.trim();
    if (!title || !url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // protokolsiz kiritilsa ham qabul qilamiz
    start(async () => {
      try {
        await addNormativeLink({ title, url, folder: folder.trim() || null });
        setLinkTitle(""); setLinkUrl(""); setOpen(false);
        toast.success(t("projects.stageDocs.added"));
        router.refresh();
      } catch {
        toast.error(t("normative.linkError"));
      }
    });
  }

  const tooBig = !!staged && staged.file.size > maxBytes;
  const busy = preparing || uploading;

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("projects.stageDocs.empty")}</p>
      ) : (
        <div className="space-y-4">
          <RegistryFilters value={filter} onChange={setFilter} years={years} shown={filtered.length} total={documents.length} />
          {filtered.length === 0 && <p className="text-sm text-[var(--muted)]">{tn("noMatches")}</p>}
          {groups.map((g) => (
            <section key={g.key || "__loose__"} className="space-y-2">
              <div className="flex items-center gap-2">
                <Folder className="size-4 shrink-0 text-[var(--primary)]" />
                <span className="min-w-0 truncate text-sm font-semibold">{g.name}</span>
                <span className="shrink-0 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[var(--muted)]">
                  {g.docs.length}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 sm:pl-6">
                {g.docs.map((d) => {
                  const meta = `${humanSize(d.fileSize)}${d.uploaderName ? ` · ${d.uploaderName}` : ""} · ${formatDate(d.uploadedAt as Date, locale)}`;
                  const rm = d.meta ?? null;
                  const repealed = rm?.status === "repealed";
                  const newerId = repealed && rm?.supersededById && docNames.has(rm.supersededById) ? rm.supersededById : null;
                  const hasChips = !!rm && (repealed || !!rm.docType || !!rm.docNumber || !!rm.docDate || !!rm.issuedBy || !!rm.summary);
                  const editMeta = canEditDocMeta(me, d.uploadedByUserId);
                  const summaries = ackSummaries?.[d.id] ?? [];
                  const hasActions = editMeta || canAck || summaries.length > 0;
                  return (
                    <li
                      key={d.id}
                      id={`doc-${d.id}`}
                      className={cn(
                        "min-w-0 scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 transition-[opacity,box-shadow] duration-300",
                        repealed && flashId !== d.id && "opacity-60",
                        flashId === d.id && "shadow-[0_0_0_2px_var(--primary)]"
                      )}
                    >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${d.isLink ? "bg-[var(--accent-soft,var(--primary-soft))] text-[var(--accent,var(--primary))]" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}>
                        {d.isLink ? <Link2 className="size-4" /> : <FileText className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" title={d.fileName}>{d.fileName}</p>
                        <p className="truncate text-xs text-[var(--muted)]" title={d.isLink ? d.fileUrl : undefined}>{d.isLink ? d.fileUrl : meta}</p>
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
                            {folderNames.map((f) => (<option key={f} value={f}>{f}</option>))}
                          </select>
                        </div>
                      )}
                      {d.isLink ? (
                        <Button asChild variant="ghost" size="icon-sm" title={t("common.open")}>
                          <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /></a>
                        </Button>
                      ) : (
                        <Button asChild variant="ghost" size="icon-sm" title={t("common.download")}>
                          <a href={d.fileUrl} download><Download className="size-4" /></a>
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          aria-label={t("common.delete")}
                          onClick={() => start(async () => { await removeNormativeDocument(d.id); })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                    {hasChips && rm && (
                      <div className="mt-2 min-w-0 space-y-1 sm:pl-11">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
                          {repealed && <StatusTag tone="red" size="sm">{tn("statusRepealed")}</StatusTag>}
                          {isDocType(rm.docType) && (
                            <span className="rounded-md bg-[var(--primary-soft)] px-1.5 py-0.5 font-semibold text-[var(--primary)]">{tn(`type.${rm.docType}`)}</span>
                          )}
                          {rm.docNumber && (
                            <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold tabular-nums text-[var(--foreground)]">№ {rm.docNumber}</span>
                          )}
                          {rm.docDate && (
                            <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 tabular-nums text-[var(--muted)]">{ymdToDots(rm.docDate)}</span>
                          )}
                          {rm.issuedBy && (
                            <span className="min-w-0 max-w-full truncate rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[var(--muted)]" title={rm.issuedBy}>{rm.issuedBy}</span>
                          )}
                          {newerId && (
                            <a
                              href={`#doc-${newerId}`}
                              onClick={(e) => { e.preventDefault(); goToDoc(newerId); }}
                              title={docNames.get(newerId)}
                              className="font-semibold text-[var(--primary)] hover:underline"
                            >
                              {tn("newVersion")}
                            </a>
                          )}
                        </div>
                        {rm.summary && (
                          <p className="line-clamp-2 whitespace-pre-line break-words text-xs text-[var(--muted)] [overflow-wrap:anywhere]" title={rm.summary}>{rm.summary}</p>
                        )}
                      </div>
                    )}
                    {hasActions && (
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-2 sm:pl-11">
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
                        {summaries.map((s) => (
                          <AckProgress key={s.requestId} requestId={s.requestId} total={s.total} acknowledged={s.acknowledged} deadline={s.deadline} />
                        ))}
                      </div>
                    )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {canManage && (
        <div className="max-w-lg">
          {/* Standart holda yiğiq: tugma bosilganda papka + fayl yuklaş formasi ochiladi (Tahlil kabi). */}
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
            <div className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] py-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
              >
                <Plus className="size-4" />
                {t("projects.projectDocs.addFile")}
              </button>
            </div>
          </div>
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
        <div className="space-y-2.5 rounded-xl border border-dashed border-[var(--border-strong)] p-3">
          <div className="space-y-2">
            <label htmlFor="normative-folder" className="block text-xs font-semibold text-[var(--muted)]">
              {t("projects.stageDocs.folder")}
            </label>
            <select
              id="normative-folder"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 pr-8 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              <option value="">{t("projects.stageDocs.folderPlaceholder")}</option>
              {folderNames.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              maxLength={120}
              placeholder={t("projects.stageDocs.newFolderPlaceholder") ?? t("projects.stageDocs.folderPlaceholder")}
              className="h-10 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3 text-sm font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

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

          <p className="text-xs text-[var(--muted)]">{t("projects.stageDocs.folderHint", { folder: folder.trim() || uncategorized })}</p>
          <p className="text-xs text-[var(--muted)]">{t("projects.stageDocs.sizeHint", { max: humanSize(maxBytes) })}</p>

          <div className="flex gap-2">
            <Button type="button" onClick={onAdd} disabled={!staged || busy || tooBig} className="flex-1">
              {uploading ? (<><Loader2 className="size-4 animate-spin" />{t("projects.stageDocs.uploading")}</>) : (<><Plus className="size-4" />{t("common.add")}</>)}
            </Button>
            <Button type="button" variant="ghost" disabled={uploading} onClick={() => { setOpen(false); setStaged(null); }}>
              <ChevronUp className="size-4" />
              {t("projects.projectDocs.hide")}
            </Button>
          </div>

          {/* Yoki fayl örniga taşqi havola qöşiş. */}
          <div className="flex items-center gap-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            {t("normative.orLink")}
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} maxLength={255} placeholder={t("normative.linkTitlePlaceholder")} className="h-10" />
          <div className="flex flex-wrap gap-2">
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} inputMode="url" placeholder="https://..." className="h-10 flex-1 min-w-[160px]" />
            <Button type="button" variant="outline" onClick={onAddLink} disabled={pending || !linkTitle.trim() || !linkUrl.trim()} className="shrink-0">
              <Link2 className="size-4" />{t("normative.addLink")}
            </Button>
          </div>
        </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
