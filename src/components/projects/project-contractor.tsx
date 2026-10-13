"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconHeartHandshake as Handshake, IconPhone as Phone, IconUser as User, IconTrash as Trash2, IconPlus as Plus } from "@tabler/icons-react";
import { createContractor, addProjectStudio, removeProjectStudio } from "@/server/actions/projects";

type Contractor = { id: string; name: string; contactPerson: string | null; contactPhone: string | null; logoUrl?: string | null };
type Studio = { id: string; name: string; logoUrl?: string | null };
type Option = { id: string; name: string };

export function ProjectContractor({
  projectId,
  company,
  studios,
  contractors,
  canManage,
}: {
  projectId: string;
  /** Asosiy studiya (external_company_id). Aloqa maʼlumotlari faqat şu studiya uçun körsatiladi. */
  company: Contractor | null;
  /** Loyihaga biriktirilgan barcha studiyalar (asosiysi ham şu röyxatda). */
  studios: Studio[];
  contractors: Option[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [person, setPerson] = useState("");
  const [phone, setPhone] = useState("");

  const field =
    "h-10 w-full rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm font-medium text-[var(--ink)] focus:border-[var(--line-strong)] focus:outline-none";

  const matchesExisting = (v: string) => contractors.some((c) => c.name.trim().toLowerCase() === v.trim().toLowerCase());

  function resetForm() {
    setAdding(false);
    setName("");
    setPerson("");
    setPhone("");
  }

  function add() {
    const nm = name.trim();
    if (!nm) return;
    // Allaqaçon biriktirilgan bölsa — qaytmaymiz (server ham onConflictDoNothing bilan himoyalangan).
    if (studios.some((s) => s.name.trim().toLowerCase() === nm.toLowerCase())) {
      resetForm();
      return;
    }
    const existing = contractors.find((c) => c.name.trim().toLowerCase() === nm.toLowerCase());
    start(async () => {
      try {
        let companyId = existing?.id ?? null;
        if (!companyId) {
          const created = await createContractor({ name: nm, contactPerson: person.trim() || null, contactPhone: phone.trim() || null });
          companyId = created.id;
        }
        await addProjectStudio(projectId, companyId);
        toast.success(t("projects.contractor.saved"));
        resetForm();
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function remove(companyId: string) {
    start(async () => {
      try {
        await removeProjectStudio(projectId, companyId);
        toast.success(t("projects.contractor.removed"));
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Handshake className="size-4 text-[var(--muted)]" />
          {t("projects.contractorLabel")}
        </h3>
        {canManage && !adding && (
          <Button variant="ghost" size="icon-sm" onClick={() => setAdding(true)} aria-label={t("common.add")}>
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {studios.length > 0 ? (
        <ul className="space-y-3">
          {studios.map((s) => {
            const isPrimary = company?.id === s.id;
            return (
              <li key={s.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  {s.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt="" loading="lazy" decoding="async" className="mb-1.5 h-12 w-auto max-w-[140px] rounded-lg border border-[var(--border)] object-contain bg-[var(--surface-2)] p-1" />
                  )}
                  <p className="break-words font-semibold">{s.name}</p>
                  {isPrimary && company?.contactPerson && (
                    <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                      <User className="size-3.5 shrink-0" />
                      {company.contactPerson}
                    </p>
                  )}
                  {isPrimary && company?.contactPhone && (
                    <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                      <Phone className="size-3.5 shrink-0" />
                      {company.contactPhone}
                    </p>
                  )}
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    aria-label={t("projects.contractor.remove")}
                    className="shrink-0 text-[var(--danger)]"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        !adding && <p className="text-sm text-[var(--muted)]">{t("projects.contractor.none")}</p>
      )}

      {adding && (
        <div className="space-y-2 border-t border-[var(--line)] pt-3">
          <input
            list={`contractors-${projectId}`}
            className={field}
            placeholder={t("projects.contractor.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
          />
          <datalist id={`contractors-${projectId}`}>
            {contractors.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          {name.trim() !== "" && !matchesExisting(name) && (
            <>
              <Input placeholder={t("projects.contractor.person")} value={person} onChange={(e) => setPerson(e.target.value)} />
              <Input placeholder={t("projects.contractor.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={add} disabled={pending || !name.trim()} size="sm">
              <Plus className="size-4" />
              {t("common.add")}
            </Button>
            <Button onClick={resetForm} variant="ghost" size="sm" disabled={pending}>
              {t("common.cancel")}
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)]">{t("projects.contractor.hint")}</p>
        </div>
      )}
    </div>
  );
}
