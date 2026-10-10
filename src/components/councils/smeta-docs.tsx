"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { signSmetaDocForWord } from "@/server/actions/smeta-docs";
import {
  IconFileTypePdf as PdfIcon,
  IconFileTypeDocx as WordIcon,
  IconPhoto as PhotoIcon,
  IconFileText as FileIcon,
  IconDownload as Download,
  IconExternalLink as ExternalLink,
  IconX as X,
} from "@tabler/icons-react";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Status } from "@/components/ui-biib/Status";
import { Button } from "@/components/ui/button";
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
  pdf: "text-[var(--danger)]", word: "text-[var(--info)]", image: "text-[var(--success)]", other: "text-[var(--ink-3)]",
};

/**
 * Smeta komissiyasi sonlari arxivi: 1 dan oxirgigacha har bir son bitta oyna-kartadagi
 * raqamli katakda; fayllar yashirin turadi, sonni bosganda oʻsha sonning fayllari oʻsha
 * kartaning ichida ajratuvchi qatorlar boʻlib ochiladi (quti ichida quti emas).
 */
export function SmetaDocs() {
  const t = useTranslations("kengash.smetaDocs");
  const [active, setActive] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const items = DATA.items;
  const current = items.find((i) => i.n === active) ?? null;

  // Son ochilganda fayllar paneli koʻrinishga keltiriladi.
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
    <Section title={t("title")} meta={t("subtitle", { last: DATA.lastNumber })}>
      <Card>
        {/* Raqamli kataklar: 1 dan oxirgigacha. Bosilganda fayllari pastda ochiladi. */}
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
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
                  "flex flex-col items-center justify-center gap-1 rounded-[var(--radius-m)] px-2 py-3 text-center transition-colors",
                  empty
                    ? "cursor-default text-[var(--ink-3)] opacity-55"
                    : isOpen
                      ? "bg-[var(--surface-3)] text-[var(--tint)]"
                      : "bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]"
                )}
              >
                <span className="text-xl font-extrabold tabular-nums leading-none">{it.n}</span>
                <span className="t-micro leading-tight text-[var(--ink-3)]">
                  {empty ? t("noFiles") : t("filesShort", { n: it.files.length })}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bosilgan sonning fayllari — bir xil karta ichida, ajratuvchi chiziq bilan */}
        {current && current.files.length > 0 && (
          <div ref={panelRef} className="mt-5 scroll-mt-24 border-t border-[var(--line)] pt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)]">
                {t("numberTitle", { n: current.n })}
                {current.dateLabel && <span className="ml-2 t-small font-medium text-[var(--ink-3)]">, {current.dateLabel}</span>}
              </h3>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label={t("close")}
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="divide-y divide-[var(--line)]">
              {current.files.map((f) => {
                const Icon = KIND_ICON[f.kind];
                const isWord = f.kind === "word";
                return (
                  <li key={f.id} className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:gap-3">
                    <Icon className={cn("size-6 shrink-0", KIND_TONE[f.kind])} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-snug text-[var(--ink)]">{f.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 t-micro text-[var(--ink-3)]">
                        <span className="uppercase">{t(`kind.${f.kind}`)}</span>
                        <span>,</span>
                        <span className="tabular-nums">{humanSize(f.size)}</span>
                        {f.sealed && <Status tone="warning">{t("sealed")}</Status>}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isWord ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => openInWord(f)}>
                          <WordIcon className="size-4 text-[var(--info)]" /> {t("openWord")}
                        </Button>
                      ) : (
                        <Button asChild variant="outline" size="sm">
                          <a href={fileUrl(f)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4" /> {t("open")}
                          </a>
                        </Button>
                      )}
                      <Button asChild size="sm">
                        <a href={dlUrl(f)}>
                          <Download className="size-4" /> {t("download")}
                        </a>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>
    </Section>
  );
}
