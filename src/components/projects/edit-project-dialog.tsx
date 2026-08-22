"use client";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconPencil as Pencil, IconLoader2 as Loader2, IconX as X, IconSearch as Search, IconCheck as Check } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateProject } from "@/server/actions/projects";
import { PROJECT_GENRES } from "@/lib/projects/genres";
import { shortName } from "@/lib/names";

const NONE = "__none__";

type CuratorOption = { id: string; fullName: string; avatarUrl?: string | null };

type Project = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  genre: string | null;
  curatorUserId: string | null;
  curatorUserIds?: string[];
  startDate: string | null;
  deadline: string | null;
  budget: string | number | null;
  budgetCurrency: string;
};

export function EditProjectDialog({
  project,
  curators,
  open: controlledOpen,
  onOpenChange,
}: {
  project: Project;
  curators: CuratorOption[];
  /** Controlled mode — when provided, the built-in trigger button is hidden. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const controlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? controlledOpen : internalOpen;
  const setOpen = (o: boolean) => {
    onOpenChange?.(o);
    if (!controlled) setInternalOpen(o);
  };
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [type, setType] = useState(project.type === "external" ? "external" : "internal");
  const [genre, setGenre] = useState(project.genre ?? NONE);
  const [curatorIds, setCuratorIds] = useState<string[]>(
    project.curatorUserIds && project.curatorUserIds.length > 0
      ? project.curatorUserIds
      : project.curatorUserId
        ? [project.curatorUserId]
        : [],
  );
  const [curatorSearch, setCuratorSearch] = useState("");
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [budget, setBudget] = useState(project.budget != null ? String(project.budget) : "");
  const [currency, setCurrency] = useState(project.budgetCurrency || "UZS");

  const selectedCurators = useMemo(
    () => curatorIds.map((id) => curators.find((c) => c.id === id)).filter(Boolean) as CuratorOption[],
    [curatorIds, curators],
  );
  const curatorCandidates = useMemo(() => {
    const term = curatorSearch.trim().toLowerCase();
    return curators.filter((c) => !curatorIds.includes(c.id) && (term === "" || c.fullName.toLowerCase().includes(term)));
  }, [curators, curatorIds, curatorSearch]);
  function toggleCurator(id: string) {
    setCuratorIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

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
          genre: genre === NONE ? null : genre,
          curatorUserIds: curatorIds,
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
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            {t("projects.edit.button")}
          </Button>
        </DialogTrigger>
      )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label>{t("projects.fields.genre")}</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger><SelectValue placeholder={t("common.emptyValue")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("common.emptyValue")}</SelectItem>
                  {PROJECT_GENRES.map((g) => (
                    <SelectItem key={g} value={g}>{t(`projects.genre.${g}` as "projects.genre.film")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("projects.fields.curator")}</Label>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 space-y-2">
                {selectedCurators.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCurators.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-soft)] py-0.5 pl-0.5 pr-2 text-xs font-semibold text-[var(--primary)]">
                        <UserAvatar name={c.fullName} avatarUrl={c.avatarUrl} size="xs" clickable={false} />
                        {shortName(c.fullName)}
                        <button type="button" onClick={() => toggleCurator(c.id)} className="opacity-70 transition-opacity hover:opacity-100" aria-label={t("common.delete")}>
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
                  <input
                    value={curatorSearch}
                    onChange={(e) => setCuratorSearch(e.target.value)}
                    placeholder={t("common.search")}
                    className="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--surface)] pl-9 pr-3 text-sm focus-visible:border-[var(--primary)] focus-visible:outline-none"
                  />
                </div>
                {curatorSearch.trim() !== "" && (
                  <div className="max-h-44 divide-y divide-[var(--border)]/60 overflow-y-auto rounded-xl border border-[var(--border)]">
                    {curatorCandidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { toggleCurator(c.id); setCuratorSearch(""); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <UserAvatar name={c.fullName} avatarUrl={c.avatarUrl} size="xs" clickable={false} />
                        <span className="flex-1 truncate font-medium">{shortName(c.fullName)}</span>
                        <Check className="size-4 shrink-0 text-[var(--subtle)] opacity-0" />
                      </button>
                    ))}
                    {curatorCandidates.length === 0 && (
                      <p className="px-3 py-3 text-center text-xs text-[var(--muted)]">{t("common.noResults")}</p>
                    )}
                  </div>
                )}
              </div>
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
              <MoneyInput id="ep-budget" value={budget} onValueChange={setBudget} className="flex-1 min-w-0" />
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
