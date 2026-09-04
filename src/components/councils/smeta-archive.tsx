"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  IconSearch as Search,
  IconChevronDown as ChevronDown,
  IconFileText as FileText,
  IconGavel as Gavel,
  IconCalendarEvent as Calendar,
} from "@tabler/icons-react";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DocMarkdown } from "@/components/councils/doc-markdown";
import archive from "@/data/smeta-archive.json";

type Item = {
  kind: "bayon" | "xulosa";
  no: number;
  title: string;
  turi?: string | null;
  sourceFile?: string | null;
  text: string;
};
type Meeting = { no: number; dateLabel: string; date: string; items: Item[] };
type Archive = {
  title: string;
  subtitle: string;
  period: string | null;
  compiledAt: string | null;
  meetingsCount: number;
  documentsCount: number;
  meetings: Meeting[];
};

const data = archive as unknown as Archive;
type KindFilter = "all" | "xulosa" | "bayon";

export function SmetaArchive() {
  const t = useTranslations();
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [openMeetings, setOpenMeetings] = useState<Set<number>>(new Set());
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const term = q.trim().toLowerCase();
  const searching = term !== "" || kind !== "all";

  const groups = useMemo(() => {
    return data.meetings
      .map((m) => {
        const items = m.items.filter((it) => {
          if (kind !== "all" && it.kind !== kind) return false;
          if (!term) return true;
          return (
            it.title.toLowerCase().includes(term) ||
            it.text.toLowerCase().includes(term) ||
            m.dateLabel.toLowerCase().includes(term)
          );
        });
        return { ...m, items };
      })
      .filter((m) => m.items.length > 0)
      .sort((a, b) => b.no - a.no); // newest meeting first
  }, [term, kind]);

  const totalShown = groups.reduce((n, m) => n + m.items.length, 0);

  const toggleMeeting = (no: number) =>
    setOpenMeetings((s) => { const n = new Set(s); n.has(no) ? n.delete(no) : n.add(no); return n; });
  const toggleItem = (key: string) =>
    setOpenItems((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("kengash.archive.title")}</h1>
        {data.period && <p className="mt-1 text-sm text-[var(--muted)]">{data.period}</p>}
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Stat icon={<Calendar className="size-4" />} value={data.meetingsCount} label={t("kengash.archive.meetings")} />
          <Stat icon={<FileText className="size-4" />} value={data.documentsCount} label={t("kengash.archive.documents")} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("kengash.archive.searchPlaceholder")}
            className="h-11 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            ["all", t("common.all")],
            ["xulosa", t("kengash.archive.xulosalar")],
            ["bayon", t("kengash.archive.bayonlar")],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-sm font-semibold transition-all sm:px-4",
                kind === k ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-1)]" : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {searching && (
        <p className="text-xs text-[var(--muted)]">{t("kengash.archive.found", { n: totalShown })}</p>
      )}

      {/* Meetings */}
      <div className="space-y-2.5">
        {groups.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--muted)]">{t("common.noResults")}</p>
        )}
        {groups.map((m) => {
          const open = searching || openMeetings.has(m.no);
          return (
            <div key={m.no} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <button
                type="button"
                onClick={() => toggleMeeting(m.no)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)] sm:px-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)] tabular-nums">
                  {m.no}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t("kengash.archive.meetingNo", { n: m.no })}</p>
                  <p className="text-xs text-[var(--muted)]">{formatDate(m.date, locale)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)] tabular-nums">
                  {m.items.length}
                </span>
                <ChevronDown className={cn("size-4 shrink-0 text-[var(--muted)] transition-transform", open && "rotate-180")} />
              </button>

              {open && (
                <div className="space-y-2 border-t border-[var(--border)] p-2.5 sm:p-3">
                  {m.items.map((it, i) => {
                    const key = `${m.no}:${it.kind}:${it.no}:${i}`;
                    const itemOpen = openItems.has(key);
                    const isBayon = it.kind === "bayon";
                    return (
                      <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                        <button
                          type="button"
                          onClick={() => toggleItem(key)}
                          className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left sm:px-4"
                        >
                          <span className={cn(
                            "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                            isBayon ? "bg-[var(--info)]/15 text-[var(--info)]" : "bg-[var(--primary-soft)] text-[var(--primary)]",
                          )}>
                            {isBayon ? <Gavel className="size-3" /> : <FileText className="size-3" />}
                            {isBayon ? t("kengash.archive.bayon") : `№${it.no}`}
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{it.title}</span>
                          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-[var(--muted)] transition-transform", itemOpen && "rotate-180")} />
                        </button>
                        {itemOpen && (
                          <div className="border-t border-[var(--border)] px-3 py-3 sm:px-4">
                            {(it.turi || it.sourceFile) && (
                              <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                                {it.turi && <span className="font-semibold">{it.turi}</span>}
                                {it.sourceFile && <span className="inline-flex items-center gap-1 font-mono opacity-80"><FileText className="size-3" />{it.sourceFile}</span>}
                              </p>
                            )}
                            <div className="max-h-[65vh] overflow-y-auto rounded-lg bg-[var(--surface-2)] p-3 sm:p-4">
                              {it.text ? <DocMarkdown>{it.text}</DocMarkdown> : <p className="text-sm text-[var(--muted)]">—</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5">
      <span className="text-[var(--primary)]">{icon}</span>
      <span className="font-bold tabular-nums">{value}</span>
      <span className="text-[var(--muted)]">{label}</span>
    </span>
  );
}
