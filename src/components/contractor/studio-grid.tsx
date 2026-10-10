"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconSearch, IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
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
      // Koʻrib chiqish kutayotgan studiyalar roʻyxatning tepasiga chiqadi.
      .sort((a, b) => (b.waiting > 0 ? 1 : 0) - (a.waiting > 0 ? 1 : 0));
  }, [query, studios]);

  return (
    <div className="space-y-5">
      {/* Qidiruv */}
      <div className="relative max-w-md">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search")}
          className="t-body h-11 w-full rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-10 pr-3 text-[var(--ink)] placeholder:text-[var(--ink-3)] transition-colors focus-visible:border-[var(--tint)] focus-visible:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center t-small text-[var(--ink-3)]">{t("contractors.none")}</p>
      ) : (
        // Loyiha muqovalari kabi katta kvadrat plitkalar — oʻlcham/grid oʻzgarmaydi.
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
        "group flex flex-col rounded-[var(--radius-card)] border bg-[var(--surface)] p-2 transition-[transform,border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[var(--line-strong)]",
        s.waiting > 0 ? "border-[var(--warning)]" : "border-[var(--line)]",
      )}
    >
      <Link href={`/contractors/${s.id}`} className="block">
        {/* Muqova — logo yoki bosh harf (oʻlcham/aspect oʻzgarmaydi) */}
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-m)] bg-[var(--surface-2)]">
          {s.logoUrl ? (
            <SmoothImage src={s.logoUrl} alt={s.name} className="size-full object-contain p-3" />
          ) : (
            <div className="grid size-full place-items-center">
              <span className="select-none text-5xl font-black text-[var(--ink-3)]">{initial(s.name)}</span>
            </div>
          )}
          {s.waiting > 0 && (
            <span
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-[var(--radius-s)] text-[var(--warning)]"
              style={{ backgroundColor: "color-mix(in oklab, var(--warning) 18%, transparent)" }}
              title={t("contractors.inReview")}
            >
              <IconAlertTriangle className="size-4" aria-hidden />
            </span>
          )}
        </div>

        {/* Futer — nom, ostida oxirgi kirish (oddiy matn) */}
        <div className="space-y-1 px-1 pb-1 pt-2.5">
          <p className="line-clamp-2 min-h-[2.75em] text-[0.9375rem] font-semibold leading-snug text-[var(--ink)]">{s.name}</p>
          <p className="truncate t-micro text-[var(--ink-3)]">
            {s.lastOnlineLabel ?? t("contractors.neverOnline")}
          </p>
        </div>
      </Link>

      {/* Kutilayotgan studiyalar uchun tasdiqlash/rad etish — havoladan tashqarida */}
      {s.status === "pending" && (
        <div className="mt-1 border-t border-[var(--line)] px-1 pt-2.5">
          {rejecting ? (
            <div className="flex flex-col gap-1.5">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("contractors.rejectReasonPlaceholder")}
                className="h-9 w-full rounded-[var(--radius-m)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] focus-visible:border-[var(--danger)] focus-visible:outline-none"
              />
              <Button size="sm" variant="destructive" className="w-full" onClick={reject} disabled={pending || !reason.trim()}>{t("contractors.reject")}</Button>
              <Button size="sm" variant="ghost" className="w-full" onClick={() => { setRejecting(false); setReason(""); }}>{t("common.cancel")}</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Button size="sm" variant="success" className="w-full" onClick={approve} disabled={pending}><IconCheck className="size-4" />{t("contractors.approve")}</Button>
              <Button size="sm" variant="ghost" className="w-full text-[var(--danger)]" onClick={() => setRejecting(true)} disabled={pending}><IconX className="size-4" />{t("contractors.reject")}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
