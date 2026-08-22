"use client";
import { useState, useTransition, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDateTime } from "@/lib/dates";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPhone as Phone,
  IconMail as Mail,
  IconWorld as Globe,
  IconMapPin as MapPin,
  IconShieldCheck as Shield,
  IconStar as Star,
  IconFolder as FolderIcon,
  IconFile as FileIcon,
  IconLoader2 as Loader,
  IconCamera as Camera,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { updateContractorNotes } from "@/server/actions/projects";

type Company = {
  id: string;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  address: string | null;
  website: string | null;
  specialization: string | null;
  status: string;
  rating: string | number | null;
  ndaAcceptedAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

type Stats = {
  projectCount: number;
  docCount: number;
  lastActivity: Date | string | null;
};

export function StudioInfoCard({ company, stats }: { company: Company; stats: Stats }) {
  const t = useTranslations("contractors.detail");
  const locale = useLocale();
  const router = useRouter();
  const [notes, setNotes] = useState(company.notes ?? "");
  const [saved, setSaved] = useState(true);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function saveNotes() {
    start(async () => {
      await updateContractorNotes(company.id, notes);
      setSaved(true);
      toast.success(t("notesSaved"));
    });
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/files/studio-logo?companyId=${company.id}&name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("upload failed");
      toast.success("Logo yuklandi");
      router.refresh();
    } catch {
      toast.error("Logo yuklab bo'lmadi");
    } finally {
      setUploading(false);
    }
  }

  const rating = company.rating != null ? Number(company.rating) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-3)] cursor-pointer"
        >
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-[var(--muted)]">
              {company.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
            {uploading ? <Loader className="size-5 text-white animate-spin" /> : <Camera className="size-5 text-white" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold truncate">{company.name}</h2>
          {company.contactPerson && (
            <p className="text-sm text-[var(--muted)]">{company.contactPerson}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {company.status !== "approved" && (
              <Badge variant={company.status === "rejected" ? "danger" : "warning"}>
                {company.status}
              </Badge>
            )}
            {rating != null && (
              <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                <Star className="size-4 fill-current" /> {rating.toFixed(1)}
              </span>
            )}
            {company.ndaAcceptedAt && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Shield className="size-3.5" /> NDA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact links */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {company.contactPhone && (
          <a
            href={`tel:${company.contactPhone}`}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-2)]"
          >
            <Phone className="size-4 text-[var(--primary)]" />
            <span className="truncate">{company.contactPhone}</span>
          </a>
        )}
        {company.contactEmail && (
          <a
            href={`mailto:${company.contactEmail}`}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-2)]"
          >
            <Mail className="size-4 text-[var(--primary)]" />
            <span className="truncate">{company.contactEmail}</span>
          </a>
        )}
        {company.website && (
          <a
            href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-2)]"
          >
            <Globe className="size-4 text-[var(--primary)]" />
            <span className="truncate">{company.website}</span>
          </a>
        )}
        {company.address && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm">
            <MapPin className="size-4 shrink-0 text-[var(--primary)]" />
            <span className="truncate">{company.address}</span>
          </div>
        )}
      </div>

      {/* Specialization */}
      {company.specialization && (
        <div className="rounded-xl border border-[var(--border)] px-4 py-3">
          <p className="text-xs font-semibold text-[var(--muted)] mb-1">{t("specialization")}</p>
          <p className="text-sm">{company.specialization}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center stagger-children">
        <div className="rounded-xl bg-[var(--surface-2)] py-3 hover-scale">
          <div className="flex items-center justify-center gap-1 text-[var(--primary)]">
            <FolderIcon className="size-4" />
            <span className="text-lg font-bold animate-count">{stats.projectCount}</span>
          </div>
          <p className="text-[11px] font-medium text-[var(--muted)]">{t("statsProjects")}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] py-3 hover-scale">
          <div className="flex items-center justify-center gap-1 text-[var(--primary)]">
            <FileIcon className="size-4" />
            <span className="text-lg font-bold animate-count">{stats.docCount}</span>
          </div>
          <p className="text-[11px] font-medium text-[var(--muted)]">{t("statsDocs")}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] py-3 px-2">
          <p className="text-xs font-bold text-[var(--foreground)]">
            {stats.lastActivity
              ? formatDateTime(stats.lastActivity, locale)
              : "—"}
          </p>
          <p className="text-[11px] font-medium text-[var(--muted)]">{t("statsLastActivity")}</p>
        </div>
      </div>

      {/* Login info */}
      {company.contactEmail && (
        <div className="rounded-xl border border-[var(--border)] px-4 py-3">
          <p className="text-xs font-semibold text-[var(--muted)] mb-1">{t("loginInfo")}</p>
          <p className="text-sm font-mono">{company.contactEmail}</p>
        </div>
      )}

      {/* Staff notes */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("notes")}</p>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          placeholder={t("notesPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--input)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--subtle)] focus:border-[var(--primary)] focus:outline-none transition-colors"
        />
        {!saved && (
          <button
            onClick={saveNotes}
            disabled={pending}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {pending ? <Loader className="mx-2 size-4 animate-spin" /> : t("notesSave")}
          </button>
        )}
      </div>
    </div>
  );
}
