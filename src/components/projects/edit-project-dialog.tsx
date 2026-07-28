"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProject } from "@/server/actions/projects";

const NONE = "__none__";

type Project = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  curatorUserId: string | null;
  startDate: string | null;
  deadline: string | null;
  budget: string | number | null;
  budgetCurrency: string;
};

export function EditProjectDialog({
  project,
  curators,
}: {
  project: Project;
  curators: { id: string; fullName: string }[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [type, setType] = useState(project.type === "external" ? "external" : "internal");
  const [curator, setCurator] = useState(project.curatorUserId ?? NONE);
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [budget, setBudget] = useState(project.budget != null ? String(project.budget) : "");
  const [currency, setCurrency] = useState(project.budgetCurrency || "UZS");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError(t("projects.fields.nameRequired")); return; }
    start(async () => {
      try {
        await updateProject(project.id, {
          name: name.trim(),
          description: description.trim() || null,
          type: type as "internal" | "external",
          curatorUserId: curator === NONE ? null : curator,
          startDate: startDate || null,
          deadline: deadline || null,
          budget: budget ? Number(budget) : null,
          budgetCurrency: currency.trim() || "UZS",
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" />
          {t("projects.edit.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{t("projects.edit.title")}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">{t("projects.fields.name")}</Label>
            <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-desc">{t("projects.fields.description")}</Label>
            <Textarea id="ep-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("projects.fields.type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">{t("projects.type.internal")}</SelectItem>
                  <SelectItem value="external">{t("projects.type.external")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("projects.fields.curator")}</Label>
              <Select value={curator} onValueChange={setCurator}>
                <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("common.emptyValue")}</SelectItem>
                  {curators.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-start">{t("projects.fields.startDate")}</Label>
              <Input id="ep-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-deadline">{t("projects.fields.deadline")}</Label>
              <Input id="ep-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-budget">{t("projects.fields.budget")}</Label>
            <div className="flex gap-2">
              <Input id="ep-budget" type="number" step="0.01" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} className="flex-1 min-w-0" />
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-20 shrink-0" />
            </div>
          </div>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">{t("common.cancel")}</Button></DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
