"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconPencil as Pencil, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { updateStage } from "@/server/actions/stages";

type Stage = {
  id: string;
  name: string;
  plannedStartDate: string | null;
  plannedDeadline: string | null;
  plannedAmount: number | null;
};

export function EditStageDialog({ stage, currency = "UZS" }: { stage: Stage; currency?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(stage.name);
  const [startDate, setStartDate] = useState(stage.plannedStartDate ?? "");
  const [deadline, setDeadline] = useState(stage.plannedDeadline ?? "");
  const [amount, setAmount] = useState(stage.plannedAmount != null ? String(stage.plannedAmount) : "");

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
          <div className="space-y-1.5">
            <Label htmlFor="es-amount">{t("projects.editStage.budget")}</Label>
            <div className="flex gap-2 items-center">
              <MoneyInput id="es-amount" value={amount} onValueChange={setAmount} className="flex-1 min-w-0" />
              <span className="text-sm text-[var(--muted)] shrink-0">{currency}</span>
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
