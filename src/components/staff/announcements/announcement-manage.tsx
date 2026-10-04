"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { deleteAnnouncement, updateAnnouncement } from "@/server/actions/announcements";
import { errorKey } from "./logic";

type Editable = {
  id: string;
  title: string;
  body: string | null;
  /** YYYY-MM-DD (Toshkent) yoki null */
  pinnedUntil: string | null;
  expiresAt: string | null;
};

/** Muallif / direktor / egasi uchun: sarlavha, matn, qadash va amal qilish sanalarini tahrirlash. */
export function EditAnnouncementButton({ a, today }: { a: Editable; today: string }) {
  const t = useTranslations("staffX.announcements");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(a.title);
  const [body, setBody] = useState(a.body ?? "");
  const [pinnedUntil, setPinnedUntil] = useState(a.pinnedUntil ?? "");
  const [expiresAt, setExpiresAt] = useState(a.expiresAt ?? "");

  function onOpenChange(next: boolean) {
    if (next) {
      // Har ochilishda joriy qiymatlardan boshlaymiz (oldingi bekor qilingan tahrir qolmasin).
      setTitle(a.title);
      setBody(a.body ?? "");
      setPinnedUntil(a.pinnedUntil ?? "");
      setExpiresAt(a.expiresAt ?? "");
    }
    setOpen(next);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error(t("errors.titleTooShort"));
      return;
    }
    start(async () => {
      try {
        const res = await updateAnnouncement({
          id: a.id,
          title: title.trim(),
          body,
          pinnedUntil: pinnedUntil || null,
          expiresAt: expiresAt || null,
        });
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        toast.success(tr("common.saved"));
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <IconPencil className="size-4" />
          <span className="hidden sm:inline">{t("edit")}</span>
          <span className="sr-only sm:hidden">{t("edit")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1.5rem)] max-h-[85vh] gap-4 overflow-y-auto p-5 sm:max-w-2xl sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-w-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-edit-title">{t("fieldTitle")}</Label>
            <Input id="ann-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} required />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <Label htmlFor="ann-edit-body">{t("fieldBody")}</Label>
              <span className="text-xs text-[var(--muted)]">{t("markdownHint")}</span>
            </div>
            <Textarea id="ann-edit-body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={20000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ann-edit-pinned">{t("pinnedUntil")}</Label>
              <Input
                id="ann-edit-pinned"
                type="date"
                min={a.pinnedUntil && a.pinnedUntil < today ? a.pinnedUntil : today}
                value={pinnedUntil}
                onChange={(e) => setPinnedUntil(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ann-edit-expires">{t("expiresAt")}</Label>
              <Input
                id="ann-edit-expires"
                type="date"
                min={a.expiresAt && a.expiresAt < today ? a.expiresAt : today}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {tr("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <IconLoader2 className="size-4 animate-spin" />}
              {tr("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Eʼlonni (soʻrovnoma, ovozlar, koʻrilganlik va ilova fayli bilan) oʻchiradi. */
export function DeleteAnnouncementButton({ id }: { id: string }) {
  const t = useTranslations("staffX.announcements");
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (!window.confirm(t("deleteConfirm"))) return;
    start(async () => {
      try {
        const res = await deleteAnnouncement(id);
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        toast.success(t("deleted"));
        router.push("/elonlar");
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={onClick}
      className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
    >
      {pending ? <IconLoader2 className="size-4 animate-spin" /> : <IconTrash className="size-4" />}
      <span className="hidden sm:inline">{t("delete")}</span>
      <span className="sr-only sm:hidden">{t("delete")}</span>
    </Button>
  );
}
