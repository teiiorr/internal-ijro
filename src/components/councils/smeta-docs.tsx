"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { signSmetaDocForWord } from "@/server/actions/smeta-docs";
import {
  IconPinned as Pinned,
  IconFileTypePdf as PdfIcon,
  IconFileTypeDocx as WordIcon,
  IconPhoto as PhotoIcon,
  IconFileText as FileIcon,
  IconDownload as Download,
  IconExternalLink as ExternalLink,
  IconFolderOpen as FolderOpen,
  IconX as X,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import manifest from "@/data/smeta-docs.json";

type Kind = "pdf" | "word" | "image" | "other";
type DocFile = { id: string; name: string; kind: Kind; size: number; sealed: boolean };
type Item = { n: number; date: string | null; dateLabel: string | null; files: DocFile[] };
const DATA = manifest as { lastNumber: number; totalFiles: number; items: Item[] };

// Fayl manzili: har bir segment xavfsiz kodlanadi (nom query orqali — asl koʻrinishda yuklab olish uchun).
const fileUrl = (f: DocFile) => `/api/smeta-docs/${f.id.split("/").map(encodeURIComponent).join("/")}`;
const dlUrl = (f: DocFile) => `${fileUrl(f)}?dl=1&name=${encodeURIComponent(f.name)}`;

function humanSize(b: number): string {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

const KIND_ICON: Record<Kind, React.ComponentType<{ className?: string }>> = {
  pdf: PdfIcon, word: WordIcon, image: PhotoIcon, other: FileIcon,
};
const KIND_TONE: Record<Kind, string> = {
  pdf: "text-[#E02424]", word: "text-[#2563EB]", image: "text-[#16A34A]", other: "text-[var(--muted)]",
};

/**
 * Smeta komissiyasi sonlari arxivi: 1 dan oxirgigacha har bir son "butunlab"
 * qadab qoʻyilган kartada; fayllar yashirin turadi, sonni bosganda oʻsha sonning
 * barcha fayllari ochiladi. PDF/rasm — brauzerda yangi oynada; Word — Word'da ochish
 * yoki yuklab olish. Fayllar serverda kod/repozitoriydan tashqarida saqlanadi.
 */
export function SmetaDocs() {
  const t = useTranslations("kengash.smetaDocs");
  const [active, setActive] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const items = DATA.items;
  const current = items.find((i) => i.n === active) ?? null;

  // Son ochilganda fayllar paneli koʻrinishga keltiriladi (mobilda panel grid'dan keyin turadi).
  useEffect(() => {
    if (active !== null) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active]);

  async function openInWord(f: DocFile) {
    // Word ish stoli ilovasi faylni oʻz jarayonida yuklaydi (cookie yoʻq) — shu faylga
    // imzolangan qisqa muddatli token olamiz. "ofv" — koʻrish uchun ochish.
    const token = await signSmetaDocForWord(f.id);
    const q = token ? `?t=${encodeURIComponent(token)}` : "";
    window.location.assign(`ms-word:ofv|u|${window.location.origin}${fileUrl(f)}${q}`);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-5 shrink-0 text-[var(--primary)]" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">{t("title")}</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{t("subtitle", { last: DATA.lastNumber })}</p>
          </div>
        </div>

        {/* Qadab qoʻyilган sonlar: 1 dan oxirgigacha. Bosilganda fayllari ochiladi. */}
        <div className="grid grid-cols-3 gap-3 pt-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {items.map((it) => {
            const empty = it.files.length === 0;
            const isOpen = it.n === active;
            return (
              <button
                key={it.n}
                type="button"
                disabled={empty}
                onClick={() => setActive(isOpen ? null : it.n)}
                aria-expanded={isOpen}
                title={empty ? t("noFiles") : t("filesCount", { n: it.files.length })}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 pb-3 pt-5 text-center transition-all",
                  empty
                    ? "cursor-default border-dashed border-[var(--border)] opacity-45"
                    : isOpen
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-[var(--shadow-2)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-1)]"
                )}
              >
                {/* Butun (pushpin) — kartani qadab turgandek */}
                <Pinned
                  className={cn(
                    "absolute -top-2.5 left-1/2 size-5 -translate-x-1/2 -rotate-12 drop-shadow transition-colors",
                    empty ? "text-[var(--subtle)]" : isOpen ? "text-[var(--primary)]" : "text-[#E08C10] group-hover:text-[var(--primary)]"
                  )}
                />
                <span className="text-xl font-extrabold tabular-nums leading-none">{it.n}</span>
                <span className="text-[11px] font-semibold leading-tight text-[var(--muted)]">
                  {empty ? t("noFiles") : t("filesShort", { n: it.files.length })}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bosilgan sonning fayllari */}
        {current && current.files.length > 0 && (
          <div ref={panelRef} className="scroll-mt-24 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pinned className="size-5 -rotate-12 text-[var(--primary)]" />
                <h3 className="text-base font-bold">
                  {t("numberTitle", { n: current.n })}
                  {current.dateLabel && <span className="ml-2 text-sm font-medium text-[var(--muted)]">· {current.dateLabel}</span>}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label={t("close")}
                className="grid size-8 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--glass-fill)] active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="space-y-2">
              {current.files.map((f) => {
                const Icon = KIND_ICON[f.kind];
                const isWord = f.kind === "word";
                return (
                  <li
                    key={f.id}
                    className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <Icon className={cn("size-6 shrink-0", KIND_TONE[f.kind])} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-snug">{f.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
                        <span className="uppercase">{t(`kind.${f.kind}`)}</span>
                        <span>·</span>
                        <span className="tabular-nums">{humanSize(f.size)}</span>
                        {f.sealed && (
                          <span className="rounded-md bg-[#E08C10]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#B26E00] dark:text-[#F0A43A]">
                            {t("sealed")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isWord ? (
                        <button
                          type="button"
                          onClick={() => openInWord(f)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1.5 text-xs font-bold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-95"
                        >
                          <WordIcon className="size-4 text-[#2563EB]" /> {t("openWord")}
                        </button>
                      ) : (
                        <a
                          href={fileUrl(f)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1.5 text-xs font-bold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-95"
                        >
                          <ExternalLink className="size-4" /> {t("open")}
                        </a>
                      )}
                      <a
                        href={dlUrl(f)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-110 active:scale-95"
                      >
                        <Download className="size-4" /> {t("download")}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
