"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconSearch, IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StatusTag } from "@/components/ui/status-tag";
import { Button } from "@/components/ui/button";
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
  waiting: number;
  // Server'da hisoblangan nisbiy "oxirgi kirish" matni ("3 soat oldin"); null — hech qachon kirmagan.
  lastOnlineLabel: string | null;
};

const initial = (name: string) => name.replace(/["'«»“”]/g, "").trim().charAt(0).toUpperCase() || "?";

export function StudioGrid({ studios }: { studios: Studio[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return studios
      .filter((s) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.contactPerson?.toLowerCase().includes(q) ||
          s.projects.some((p) => p.name.toLowerCase().includes(q))
        );
      })
      // Körib çiqiş kutayotgan studiyalar röyxatning tepasiga çiqadi.
      .sort((a, b) => (b.waiting > 0 ? 1 : 0) - (a.waiting > 0 ? 1 : 0));
  }, [query, studios]);

  return (
    <div className="space-y-5">
      {/* Qidiruv */}
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search")}
          className="h-11 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-16 text-[var(--muted)]">
          <IconSearch className="mb-3 size-10 opacity-40" />
          <p className="text-sm font-medium">{t("contractors.none")}</p>
        </div>
      ) : (
        // Loyiha muqovalari kabi katta kvadrat plitkalar
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((s) => (
            <StudioCard key={s.id} s={s} t={t} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudioCard({ s, t, router }: { s: Studio; t: ReturnType<typeof useTranslations>; router: ReturnType<typeof useRouter> }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

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
    <div
      className={cn(
        "group flex flex-col rounded-2xl border bg-[var(--card)] p-2 shadow-[var(--shadow-1)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)]",
        s.waiting > 0 ? "border-[var(--warning)]/60" : "border-[var(--border)]"
      )}
    >
      <Link href={`/contractors/${s.id}`} className="block">
        {/* Muqova — logo yoki bosh harf */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
          {s.logoUrl ? (
            <SmoothImage src={s.logoUrl} alt={s.name} className="size-full object-contain p-3" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
              <span className="select-none text-5xl font-black text-[var(--subtle)]">{initial(s.name)}</span>
            </div>
          )}
          {s.waiting > 0 && (
            <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-[var(--warning)] text-white shadow-sm" title={t("contractors.inReview")}>
              <IconAlertTriangle className="size-4" />
            </span>
          )}
        </div>

        {/* Futer — nom markazda, ostida oxirgi kirish (yashil plashka) */}
        <div className="space-y-2 px-1.5 pb-1 pt-2.5">
          <p className="line-clamp-2 min-h-[2.75em] text-center text-sm font-semibold leading-snug">{s.name}</p>
          <div className="flex justify-center">
            {s.lastOnlineLabel ? (
              <StatusTag tone="green" size="sm">{s.lastOnlineLabel}</StatusTag>
            ) : (
              <StatusTag tone="muted" size="sm">{t("contractors.neverOnline")}</StatusTag>
            )}
          </div>
        </div>
      </Link>

      {/* Kutilayotgan studiyalar uçun tasdiqlaş/rad etiş — havoladan taşqarida */}
      {s.status === "pending" && (
        <div className="mt-1 border-t border-[var(--border)] px-1.5 pt-2">
          {rejecting ? (
            <div className="flex flex-col gap-1.5">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("contractors.rejectReasonPlaceholder")}
                className="h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--surface)] px-2.5 text-xs focus-visible:border-[var(--danger)] focus-visible:outline-none"
              />
              <Button size="sm" variant="destructive" className="w-full" onClick={reject} disabled={pending || !reason.trim()}>{t("contractors.reject")}</Button>
              <Button size="sm" variant="ghost" className="w-full" onClick={() => { setRejecting(false); setReason(""); }}>{t("common.cancel")}</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Button size="sm" variant="success" className="w-full" onClick={approve} disabled={pending}><IconCheck className="size-4" />{t("contractors.approve")}</Button>
              <Button size="sm" variant="outline" className="w-full text-[var(--danger)]" onClick={() => setRejecting(true)} disabled={pending}><IconX className="size-4" />{t("contractors.reject")}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
