"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject, createContractor } from "@/server/actions/projects";
import { PROJECT_GENRES } from "@/lib/projects/genres";
import { shortName } from "@/lib/names";

type Company = { id: string; name: string };
type User = { id: string; fullName: string };
type ProjectTypeOption = { id: string; name: string };

export function NewProjectForm({
  companies,
  curators,
  responsibles,
  types,
}: {
  companies: Company[];
  curators: User[];
  responsibles: User[];
  types: ProjectTypeOption[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<"internal" | "external">("internal");
  const [projectTypeId, setProjectTypeId] = useState<string>("");
  const [genre, setGenre] = useState<string>("");
  const [responsibleUserId, setResponsibleUserId] = useState<string>("");
  const [companyText, setCompanyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        // Resolve the studio: link an existing one by name, otherwise create it inline.
        let externalCompanyId: string | null = null;
        if (type === "external") {
          const nm = companyText.trim();
          if (nm) {
            const existing = companies.find((c) => c.name.trim().toLowerCase() === nm.toLowerCase());
            externalCompanyId = existing ? existing.id : (await createContractor({ name: nm })).id;
          }
        }
        const res = await createProject({
          name: String(fd.get("name") ?? ""),
          description: (fd.get("description") as string) || null,
          type,
          projectTypeId: projectTypeId || null,
          genre: genre || null,
          externalCompanyId,
          curatorUserId: (fd.get("curatorUserId") as string) || null,
          responsibleUserId: responsibleUserId || null,
          startDate: (fd.get("startDate") as string) || null,
          deadline: (fd.get("deadline") as string) || null,
          budget: fd.get("budget") ? Number(fd.get("budget")) : null,
          budgetCurrency: String(fd.get("budgetCurrency") ?? "UZS"),
        });
        router.push(`/projects/${res.id}`);
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label>{t("projects.fields.projectType")}</Label>
        <Select value={projectTypeId} onValueChange={setProjectTypeId}>
          <SelectTrigger><SelectValue placeholder={t("projects.fields.projectTypePlaceholder")} /></SelectTrigger>
          <SelectContent>
            {types.map((pt) => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--muted)]">{t("projects.fields.projectTypeHint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label>{t("projects.fields.genre")}</Label>
        <Select value={genre} onValueChange={setGenre}>
          <SelectTrigger><SelectValue placeholder={t("projects.fields.genrePlaceholder")} /></SelectTrigger>
          <SelectContent>
            {PROJECT_GENRES.map((g) => (
              <SelectItem key={g} value={g}>{t(`projects.genre.${g}` as "projects.genre.film")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--muted)]">{t("projects.fields.genreHint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("projects.fields.name")}</Label>
        <Input id="name" name="name" required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("projects.fields.description")}</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("projects.fields.type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">{t("projects.type.internal")}</SelectItem>
              <SelectItem value="external">{t("projects.type.external")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "external" && (
          <div className="space-y-1.5">
            <Label htmlFor="company">{t("projects.fields.contractor")}</Label>
            <Input
              id="company"
              list="new-project-companies"
              value={companyText}
              onChange={(e) => setCompanyText(e.target.value)}
              placeholder={t("projects.contractor.namePlaceholder")}
              maxLength={255}
            />
            <datalist id="new-project-companies">
              {companies.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
            <p className="text-xs text-[var(--muted)]">{t("projects.contractor.hint")}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t("projects.fields.curator")}</Label>
          <Select name="curatorUserId">
            <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {curators.map((c) => <SelectItem key={c.id} value={c.id}>{shortName(c.fullName)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {projectTypeId && (
          <div className="space-y-1.5">
            <Label>{t("projects.fields.responsible")}</Label>
            <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
              <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {responsibles.map((c) => <SelectItem key={c.id} value={c.id}>{shortName(c.fullName)}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--muted)]">{t("projects.fields.responsibleHint")}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="startDate">{t("projects.fields.startDate")}</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline">{t("projects.fields.deadline")}</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="budget">{t("projects.fields.budget")}</Label>
          <div className="flex gap-2">
            <MoneyInput id="budget" name="budget" className="flex-1 min-w-0" />
            <Input name="budgetCurrency" defaultValue="UZS" className="w-20 shrink-0" />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending} size="lg">{t("projects.newTitle")}</Button>
      </div>
    </form>
  );
}
