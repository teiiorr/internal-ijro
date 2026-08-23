"use client";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconPencil as Pencil, IconLoader2 as Loader2, IconSearch as Search, IconX as X } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateStage } from "@/server/actions/stages";
import { shortName } from "@/lib/names";

type Person = { id: string; fullName: string; avatarUrl?: string | null };
type Stage = {
  id: string;
  name: string;
  plannedStartDate: string | null;
  plannedDeadline: string | null;
  plannedAmount: number | null;
  contractNumber: string;
  responsibleUserId?: string | null;
};

export function EditStageDialog({ stage, users = [], currency = "UZS" }: { stage: Stage; users?: Person[]; currency?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(stage.name);
  const [startDate, setStartDate] = useState(stage.plannedStartDate ?? "");
  const [deadline, setDeadline] = useState(stage.plannedDeadline ?? "");
  const [amount, setAmount] = useState(stage.plannedAmount != null ? String(stage.plannedAmount) : "");
  const [contractNumber, setContractNumber] = useState(stage.contractNumber ?? "1");
  const [responsibleId, setResponsibleId] = useState<string | null>(stage.responsibleUserId ?? null);
  const [respSearch, setRespSearch] = useState("");

  const selectedResp = useMemo(() => users.find((u) => u.id === responsibleId) ?? null, [users, responsibleId]);
  const respCandidates = useMemo(() => {
    const q = respSearch.trim().toLowerCase();
    if (!q) return [] as Person[];
    return users.filter((u) => u.id !== responsibleId && u.fullName.toLowerCase().includes(q)).slice(0, 6);
  }, [users, responsibleId, respSearch]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 1) { setError(t("projects.fields.nameRequired")); return; }
    if (deadline && startDate && deadline < startDate) { setError(t("projects.editStage.dateOrder")); return; }
    start(async () => {
      try {
        await updateStage(stage.id, {
          name: name.trim(),
          plannedStartDate: startDate || null,
          plannedDeadline: deadline || null,
          plannedAmount: amount ? Number(amount) : null,
          contractNumber: contractNumber.trim() || "1",
          responsibleUserId: responsibleId,
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
          {t("projects.editStage.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("projects.editStage.title")}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="es-name">{t("projects.editStage.stageName")}</Label>
            <Input id="es-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
          </div>

          {/* Mas'ul (responsible) — add or remove */}
          <div className="space-y-1.5">
            <Label>{t("projects.fields.responsible")}</Label>
            <div className="rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] p-2.5 space-y-2">
              {selectedResp ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={selectedResp.fullName} avatarUrl={selectedResp.avatarUrl} size="xs" clickable={false} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{shortName(selectedResp.fullName)}</span>
                  <button type="button" onClick={() => { setResponsibleId(null); setRespSearch(""); }} className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)]" aria-label={t("common.delete")}>
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <p className="px-1 text-xs text-[var(--muted)]">{t("common.emptyValue")}</p>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
                <input
                  value={respSearch}
                  onChange={(e) => setRespSearch(e.target.value)}
                  placeholder={t("common.search")}
                  className="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--surface)] pl-9 pr-3 text-sm focus-visible:border-[var(--primary)] focus-visible:outline-none"
                />
              </div>
              {respSearch.trim() !== "" && (
                <div className="max-h-44 divide-y divide-[var(--border)]/60 overflow-y-auto rounded-xl border border-[var(--border)]">
                  {respCandidates.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setResponsibleId(u.id); setRespSearch(""); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} size="xs" clickable={false} />
                      <span className="flex-1 truncate font-medium">{shortName(u.fullName)}</span>
                    </button>
                  ))}
                  {respCandidates.length === 0 && (
                    <p className="px-3 py-3 text-center text-xs text-[var(--muted)]">{t("common.noResults")}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="es-start">{t("projects.editStage.startDate")}</Label>
              <Input id="es-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="es-end">{t("projects.editStage.endDate")}</Label>
              <Input id="es-end" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="es-amount">{t("projects.editStage.budget")}</Label>
              <div className="flex gap-2 items-center">
                <MoneyInput id="es-amount" value={amount} onValueChange={setAmount} className="flex-1 min-w-0" />
                <span className="text-sm text-[var(--muted)] shrink-0">{currency}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="es-contract">{t("projects.fields.contractNumber")}</Label>
              <Input id="es-contract" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} maxLength={50} />
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
