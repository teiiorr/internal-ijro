"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconTrash as Trash2, IconLoader2 as Loader2 } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteContest } from "@/server/actions/contests";

/** Tanlovni oʻchirish — native confirm() oʻrniga tasdiq oynasi (qizil asosiy amal). */
export function ContestDeleteButton({ contestId, contestName }: { contestId: string; contestName?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onConfirm() {
    start(async () => {
      await deleteContest(contestId);
      setOpen(false);
      router.push("/tanlov");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[var(--danger)]">
          <Trash2 className="size-4" />
          {t("common.delete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>{t("tanlov.deleteConfirm")}</DialogTitle>
          {contestName && (
            <DialogDescription className="break-words [overflow-wrap:anywhere]">{contestName}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm} className="w-full sm:w-auto">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
