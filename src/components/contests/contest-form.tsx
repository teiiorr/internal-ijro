"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconPlus as Plus, IconPencil as Pencil, IconLoader2 as Loader2, IconTrophy as Trophy } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createContest, updateContest } from "@/server/actions/contests";

type Contest = {
  id: string;
  name: string;
  participantsCount: number;
  winnerName: string | null;
  description: string | null;
  heldAt: string | null;
};

/** Create (no `contest`) or edit (with `contest`) a contest. */
export function ContestForm({ contest }: { contest?: Contest }) {
  const t = useTranslations();
  const router = useRouter();
  const isEdit = !!contest;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(contest?.name ?? "");
  const [participants, setParticipants] = useState(contest ? String(contest.participantsCount) : "");
  const [winner, setWinner] = useState(contest?.winnerName ?? "");
  const [heldAt, setHeldAt] = useState(contest?.heldAt ?? "");
  const [description, setDescription] = useState(contest?.description ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError(t("tanlov.nameRequired")); return; }
    const payload = {
      name: name.trim(),
      participantsCount: participants ? Math.max(0, Math.floor(Number(participants) || 0)) : 0,
      winnerName: winner.trim() || null,
      description: description.trim() || null,
      heldAt: heldAt || null,
    };
    start(async () => {
      try {
        if (isEdit) await updateContest(contest!.id, payload);
        else await createContest(payload);
        setOpen(false);
        if (!isEdit) { setName(""); setParticipants(""); setWinner(""); setHeldAt(""); setDescription(""); }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm"><Pencil className="size-4" />{t("common.edit")}</Button>
        ) : (
          <Button size="default"><Plus className="size-4" />{t("tanlov.add")}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-[var(--warning)]" />
            {isEdit ? t("tanlov.editTitle") : t("tanlov.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ct-name">{t("tanlov.nameLabel")}</Label>
            <Input id="ct-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder={t("tanlov.namePlaceholder")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-participants">{t("tanlov.participants")}</Label>
              <Input id="ct-participants" type="number" min={0} inputMode="numeric" value={participants} onChange={(e) => setParticipants(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-held">{t("tanlov.heldAt")}</Label>
              <Input id="ct-held" type="date" value={heldAt} onChange={(e) => setHeldAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-winner">{t("tanlov.winnerLabel")}</Label>
            <Input id="ct-winner" value={winner} onChange={(e) => setWinner(e.target.value)} placeholder={t("tanlov.winnerPlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-desc">{t("tanlov.descriptionLabel")}</Label>
            <Textarea id="ct-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
