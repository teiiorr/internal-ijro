"use client";
import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPhone as Phone,
  IconMail as Mail,
  IconWorld as Globe,
  IconMapPin as MapPin,
  IconShieldCheck as Shield,
  IconStar as Star,
  IconLoader2 as Loader,
  IconCamera as Camera,
} from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { FactList, type Fact } from "@/components/ui-biib/FactList";
import { Status } from "@/components/ui-biib/Status";
import { Textarea } from "@/components/ui-biib/Textarea";
import { Button } from "@/components/ui/button";
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

export function StudioInfoCard({ company, canManage = true }: { company: Company; canManage?: boolean }) {
  const t = useTranslations("contractors.detail");
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
      toast.error("Logo yuklab boʻlmadi");
    } finally {
      setUploading(false);
    }
  }

  const rating = company.rating != null ? Number(company.rating) : null;

  const contacts: { href: string; icon: typeof Phone; value: string; external?: boolean }[] = [];
  if (company.contactPhone) contacts.push({ href: `tel:${company.contactPhone}`, icon: Phone, value: company.contactPhone });
  if (company.contactEmail) contacts.push({ href: `mailto:${company.contactEmail}`, icon: Mail, value: company.contactEmail });
  if (company.website) contacts.push({ href: company.website.startsWith("http") ? company.website : `https://${company.website}`, icon: Globe, value: company.website, external: true });

  const facts: Fact[] = [];
  if (company.specialization) facts.push({ term: t("specialization"), value: company.specialization });
  if (company.contactEmail) facts.push({ term: t("loginInfo"), value: <span className="font-mono">{company.contactEmail}</span> });

  return (
    <Card>
      <div className="space-y-6">
        {/* Sarlavha */}
        <div className="flex items-start gap-4">
          <button
            type="button"
            disabled={!canManage}
            onClick={() => canManage && fileRef.current?.click()}
            className={`group relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-media)] bg-[var(--surface-2)] ${canManage ? "cursor-pointer" : "cursor-default"}`}
          >
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-[var(--ink-3)]">{company.name.charAt(0).toUpperCase()}</span>
            )}
            {canManage && (
              <>
                <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-media)] bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {uploading ? <Loader className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
              </>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-[var(--ink)]">{company.name}</h2>
            {company.contactPerson && <p className="t-small text-[var(--ink-2)]">{company.contactPerson}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {company.status !== "approved" && (
                <Status tone={company.status === "rejected" ? "danger" : "warning"}>{company.status}</Status>
              )}
              {rating != null && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--warning)]">
                  <Star className="size-4 fill-current" aria-hidden /> {rating.toFixed(1)}
                </span>
              )}
              {company.ndaAcceptedAt && (
                <span className="inline-flex items-center gap-1 t-micro font-medium text-[var(--success)]">
                  <Shield className="size-3.5" aria-hidden /> NDA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Aloqa */}
        {(contacts.length > 0 || company.address) && (
          <div className="flex flex-col gap-1">
            {contacts.map((c) => (
              <a
                key={c.value}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex items-center gap-2 t-small text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]"
              >
                <c.icon className="size-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
                <span className="truncate">{c.value}</span>
              </a>
            ))}
            {company.address && (
              <p className="inline-flex items-center gap-2 t-small text-[var(--ink-2)]">
                <MapPin className="size-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
                <span className="truncate">{company.address}</span>
              </p>
            )}
          </div>
        )}

        {/* Faktlar */}
        {facts.length > 0 && <FactList items={facts} />}

        {/* Xodim qaydlari */}
        {canManage ? (
          <div className="space-y-2">
            <p className="t-label text-[var(--ink)]">{t("notes")}</p>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              placeholder={t("notesPlaceholder")}
              rows={3}
              className="min-h-24"
            />
            {!saved && (
              <Button size="sm" onClick={saveNotes} disabled={pending}>
                {pending ? <Loader className="size-4 animate-spin" /> : t("notesSave")}
              </Button>
            )}
          </div>
        ) : (
          notes.trim() && (
            <div className="space-y-1">
              <p className="t-label text-[var(--ink)]">{t("notes")}</p>
              <p className="whitespace-pre-wrap t-small text-[var(--ink-2)]">{notes}</p>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
