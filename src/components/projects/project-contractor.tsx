"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconHeartHandshake as Handshake, IconPencil as Pencil, IconCheck as Check, IconPhone as Phone, IconUser as User, IconTrash as Trash2 } from "@tabler/icons-react";
import { createContractor, setProjectContractor } from "@/server/actions/projects";

type Contractor = { id: string; name: string; contactPerson: string | null; contactPhone: string | null; logoUrl?: string | null };
type Option = { id: string; name: string };

export function ProjectContractor({
  projectId,
  company,
  contractors,
  canManage,
}: {
  projectId: string;
  company: Contractor | null;
  contractors: Option[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(company?.name ?? "");
  const [person, setPerson] = useState("");
  const [phone, setPhone] = useState("");

  const field =
    "h-10 w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-transparent px-3 text-sm font-medium text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none";

  const matchesExisting = (v: string) => contractors.some((c) => c.name.trim().toLowerCase() === v.trim().toLowerCase());

  function save() {
    const nm = name.trim();
    if (!nm) return;
    const existing = contractors.find((c) => c.name.trim().toLowerCase() === nm.toLowerCase());
    start(async () => {
      try {
        let companyId = existing?.id ?? null;
        if (!companyId) {
          const created = await createContractor({ name: nm, contactPerson: person.trim() || null, contactPhone: phone.trim() || null });
          companyId = created.id;
        }
        await setProjectContractor(projectId, companyId);
        toast.success(t("projects.contractor.saved"));
        setEditing(false);
        setPerson("");
        setPhone("");
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function remove() {
    start(async () => {
      try {
        await setProjectContractor(projectId, null);
        toast.success(t("projects.contractor.removed"));
        setName("");
        setEditing(false);
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
        {canManage && !editing && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setName(company?.name ?? "");
              setEditing(true);
            }}
            aria-label={t("common.edit")}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {!editing ? (
        company ? (
          <div className="space-y-1">
            {company.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="mb-2 h-16 w-auto max-w-[160px] rounded-lg border border-[var(--border)] object-contain bg-[var(--surface-2)] p-1" />
            )}
            <p className="font-semibold">{company.name}</p>
            {company.contactPerson && (
              <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                <User className="size-3.5 shrink-0" />
                {company.contactPerson}
              </p>
            )}
            {company.contactPhone && (
              <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                <Phone className="size-3.5 shrink-0" />
                {company.contactPhone}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("projects.contractor.none")}</p>
        )
      ) : (
        <div className="space-y-2">
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
            <Button onClick={save} disabled={pending || !name.trim()} size="sm">
              <Check className="size-4" />
              {t("common.save")}
            </Button>
            <Button onClick={() => setEditing(false)} variant="ghost" size="sm" disabled={pending}>
              {t("common.cancel")}
            </Button>
            {company && (
              <Button onClick={remove} variant="ghost" size="sm" disabled={pending} className="ml-auto text-[var(--danger)]">
                <Trash2 className="size-4" />
                {t("projects.contractor.remove")}
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">{t("projects.contractor.hint")}</p>
        </div>
      )}
    </div>
  );
}
