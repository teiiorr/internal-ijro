"use client";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  IconChevronRight as ChevronRight, IconChevronDown as ChevronDown,
  IconUpload as Upload, IconLoader2 as Loader2, IconFolder as Folder,
} from "@tabler/icons-react";
import { compressImage } from "@/lib/images/compress";
import { approveContractor, rejectContractor } from "@/server/actions/projects";

type Proj = { id: string; name: string; status: string };
type C = {
  id: string;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  status: string;
  rating: string | null;
  logoUrl: string | null;
  projects: Proj[];
};

const initial = (name: string) => name.replace(/["'«»”“]/g, "").trim().charAt(0).toUpperCase() || "?";

export function ContractorRow({ c, canManageLogo }: { c: C; canManageLogo: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(c.logoUrl);
  const logoRef = useRef<HTMLInputElement>(null);

  async function onLogo(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const r = await compressImage(file, { targetBytes: 400 * 1024, maxDimension: 512 });
      const res = await fetch(`/api/files/studio-logo?companyId=${c.id}&name=${encodeURIComponent(r.file.name)}`, {
        method: "POST",
        headers: { "content-type": r.file.type || "image/jpeg" },
        body: r.file,
      });
      if (!res.ok) { toast.error(t("contractors.logoError")); return; }
      const j = (await res.json()) as { url?: string };
      if (j.url) setLogoUrl(j.url);
      toast.success(t("contractors.logoSaved"));
      router.refresh();
    } catch {
      toast.error(t("contractors.logoError"));
    } finally {
      setUploading(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Logo avatar (+ upload for managers) */}
          <div className="relative shrink-0">
            <div className="grid size-11 place-items-center overflow-hidden rounded-lg bg-[var(--surface-3)] text-[var(--muted)]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{initial(c.name)}</span>
              )}
            </div>
            {canManageLogo && (
              <>
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  disabled={uploading}
                  title={t("contractors.uploadLogo")}
                  className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-[var(--primary)] text-white shadow"
                >
                  {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] ?? null)} />
              </>
            )}
          </div>

          <div className="min-w-0">
            <Link href={`/contractors/${c.id}`} className="font-medium truncate hover:text-[var(--primary)] hover:underline transition-colors">
              {c.name}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              {t("contractors.projectsCount", { n: c.projects.length })}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={c.status === "approved" ? "success" : c.status === "rejected" ? "danger" : "warning"}>{t(`status.${c.status}` as "status.approved")}</Badge>
          {c.rating && <Badge variant="secondary">⭐ {c.rating}</Badge>}
          {c.status === "pending" && (
            <>
              <Button size="sm" disabled={pending} onClick={() => start(async () => { await approveContractor(c.id); })}>{t("common.approve")}</Button>
              {showReject ? (
                <>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("common.reason")} className="h-9 w-40" />
                  <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { await rejectContractor(c.id, reason); setShowReject(false); })}>{t("common.reject")}</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>{t("common.reject")}</Button>
              )}
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-1 sm:pl-14">
          {c.projects.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">{t("contractors.noProjects")}</p>
          ) : (
            c.projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--glass-fill)]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Folder className="size-4 shrink-0 text-[var(--primary)]" />
                  <span className="truncate font-medium">{p.name}</span>
                </span>
                <Badge variant={p.status === "completed" ? "success" : "secondary"} className="shrink-0">
                  {t(`status.${p.status}` as "status.planning")}
                </Badge>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
