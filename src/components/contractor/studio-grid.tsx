"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  IconSearch, IconFolder, IconStarFilled, IconMail, IconPhone, IconCheck, IconX, IconChevronRight, IconCalendarEvent,
} from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StatCard } from "@/components/ui/stat-card";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { approveContractor, rejectContractor } from "@/server/actions/projects";
import { cn } from "@/lib/utils";

type Proj = { id: string; name: string; status: string };
type Studio = {
  id: string;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  rating: string | null;
  logoUrl: string | null;
  rejectionReason: string | null;
  createdAt: Date | string;
  projects: Proj[];
};

const STATUS_TONE: Record<string, StatusTone> = { approved: "green", pending: "amber", rejected: "red" };
const initial = (name: string) => name.replace(/["'«»“”]/g, "").trim().charAt(0).toUpperCase() || "?";

type Filter = "all" | "pending" | "approved" | "rejected";

export function StudioGrid({ studios }: { studios: Studio[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => ({
    total: studios.length,
    pending: studios.filter((s) => s.status === "pending").length,
    approved: studios.filter((s) => s.status === "approved").length,
    rejected: studios.filter((s) => s.status === "rejected").length,
  }), [studios]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return studios.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.projects.some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [query, filter, studios]);

  const toggle = (f: Filter) => setFilter((c) => (c === f ? "all" : f));

  return (
    <div className="space-y-5">
      {/* Triage KPI band */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label={t("contractors.total")} value={counts.total} />
        <button type="button" onClick={() => toggle("pending")} className={cn("text-left transition-transform active:scale-[0.98]", filter === "pending" && "rounded-2xl ring-2 ring-[var(--warning)]")}>
          <StatCard label={t("contractors.pendingTitle")} value={counts.pending} tone="warning" filled={counts.pending > 0} />
        </button>
        <button type="button" onClick={() => toggle("approved")} className={cn("text-left transition-transform active:scale-[0.98]", filter === "approved" && "rounded-2xl ring-2 ring-[var(--success)]")}>
          <StatCard label={t("contractors.approvedTitle")} value={counts.approved} tone="success" />
        </button>
        <button type="button" onClick={() => toggle("rejected")} className={cn("text-left transition-transform active:scale-[0.98]", filter === "rejected" && "rounded-2xl ring-2 ring-[var(--danger)]")}>
          <StatCard label={t("contractors.rejectedTitle")} value={counts.rejected} tone="danger" />
        </button>
      </div>

      {/* Search + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search")}
            className="h-11 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-[10px] bg-[var(--surface-3)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            ["all", t("common.all")],
            ["pending", t("contractors.pendingTitle")],
            ["approved", t("contractors.approvedTitle")],
            ["rejected", t("contractors.rejectedTitle")],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={cn("shrink-0 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-sm font-semibold transition-all sm:px-4",
                filter === k ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-1)]" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-16 text-[var(--muted)]">
          <IconSearch className="mb-3 size-10 opacity-40" />
          <p className="text-sm font-medium">{t("contractors.none")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <StudioCard key={s.id} s={s} t={t} locale={locale} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudioCard({ s, t, locale, router }: { s: Studio; t: ReturnType<typeof useTranslations>; locale: string; router: ReturnType<typeof useRouter> }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const tone = STATUS_TONE[s.status] ?? "muted";

  function approve() {
    start(async () => {
      try { await approveContractor(s.id); toast.success(t("common.saved")); router.refresh(); }
      catch { toast.error(t("common.error")); }
    });
  }
  function reject() {
    if (!reason.trim()) return;
    start(async () => {
      try { await rejectContractor(s.id, reason.trim()); toast.success(t("common.saved")); setRejecting(false); setReason(""); router.refresh(); }
      catch { toast.error(t("common.error")); }
    });
  }

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]">
      {/* Header: logo + name + status */}
      <div className="flex items-start gap-3">
        <Link href={`/contractors/${s.id}`} className="shrink-0">
          <div className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
            {s.logoUrl ? (
              <SmoothImage src={s.logoUrl} alt={s.name} className="size-full object-contain p-1" />
            ) : (
              <span className="text-2xl font-black text-[var(--subtle)]">{initial(s.name)}</span>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/contractors/${s.id}`} className="min-w-0">
              <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight transition-colors hover:text-[var(--primary)]">{s.name}</h3>
            </Link>
            <StatusTag tone={tone} size="sm" className="shrink-0">{t(`status.${s.status}` as "status.pending")}</StatusTag>
          </div>
          {s.contactPerson && <p className="mt-0.5 truncate text-xs font-medium text-[var(--muted)]">{s.contactPerson}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--subtle)]">
            {s.contactEmail && <span className="inline-flex items-center gap-1 truncate"><IconMail className="size-3 shrink-0" />{s.contactEmail}</span>}
            {s.contactPhone && <span className="inline-flex items-center gap-1"><IconPhone className="size-3 shrink-0" />{s.contactPhone}</span>}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--primary)]"><IconFolder className="size-3.5" />{t("contractors.projectsCount", { n: s.projects.length })}</span>
        {s.rating && <span className="inline-flex items-center gap-1 font-semibold text-[var(--warning)]"><IconStarFilled className="size-3.5" />{t("contractors.ratingScale", { r: Number(s.rating).toFixed(1) })}</span>}
        <span className="inline-flex items-center gap-1"><IconCalendarEvent className="size-3.5" />{formatDate(s.createdAt as string, locale)}</span>
      </div>

      {/* Rejection reason */}
      {s.status === "rejected" && s.rejectionReason && (
        <p className="mt-2 rounded-lg bg-[var(--danger-soft)] px-2.5 py-1.5 text-xs text-[var(--danger)]">
          <span className="font-semibold">{t("contractors.reasonLabel")}:</span> {s.rejectionReason}
        </p>
      )}

      {/* Footer actions */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
        {s.status === "pending" ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {rejecting ? (
              <div className="flex w-full flex-col gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("contractors.rejectReasonPlaceholder")}
                  className="h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--surface)] px-2.5 text-xs focus-visible:border-[var(--danger)] focus-visible:outline-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(""); }}>{t("common.cancel")}</Button>
                  <Button size="sm" variant="destructive" onClick={reject} disabled={pending || !reason.trim()}>{t("contractors.reject")}</Button>
                </div>
              </div>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={pending} className="text-[var(--danger)]"><IconX className="size-4" />{t("contractors.reject")}</Button>
                <Button size="sm" variant="success" onClick={approve} disabled={pending}><IconCheck className="size-4" />{t("contractors.approve")}</Button>
              </>
            )}
          </div>
        ) : (
          <span />
        )}
        <Link href={`/contractors/${s.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--primary)]">
          {t("common.open")}<IconChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
