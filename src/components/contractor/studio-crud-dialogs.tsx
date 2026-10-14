"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconPlus as Plus,
  IconLoader2 as Loader,
  IconPencil as Pencil,
  IconTrash as Trash,
} from "@tabler/icons-react";
import {
  createStudioWithLogin,
  renameContractor,
  deleteContractor,
} from "@/server/actions/projects";

export function CreateStudioButton() {
  const t = useTranslations("contractors");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    contactEmail: "",
    password: "",
    contactPhone: "",
  });

  function reset() {
    setForm({ name: "", contactPerson: "", contactEmail: "", password: "", contactPhone: "" });
  }

  function submit() {
    start(async () => {
      try {
        const r = await createStudioWithLogin(form);
        if (!r.ok) { toast.error(tr(`common.actionErrors.${r.error}` as "common.actionErrors.not_found")); return; }
        toast.success(t("studioCreated"));
        setOpen(false);
        reset();
        router.refresh();
      } catch {
        toast.error(tr("common.error"));
      }
    });
  }

  const valid = form.name.length >= 2 && form.contactPerson.length >= 2 && form.contactEmail.includes("@") && form.password.length >= 6;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        {t("createStudio")}
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createStudio")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="t-label text-[var(--ink)] mb-1 block">{t("fields.name")}</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Studio nomi" />
            </div>
            <div>
              <label className="t-label text-[var(--ink)] mb-1 block">{t("fields.contactPerson")}</label>
              <Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} placeholder="Ism Familiya" />
            </div>
            <div>
              <label className="t-label text-[var(--ink)] mb-1 block">{t("fields.email")}</label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label className="t-label text-[var(--ink)] mb-1 block">{t("fields.password")}</label>
              <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Parol (kamida 6 belgi)" />
            </div>
            <div>
              <label className="t-label text-[var(--ink)] mb-1 block">{t("fields.phone")}</label>
              <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} placeholder="+998..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button onClick={submit} disabled={pending || !valid}>
              {pending ? <Loader className="size-4 animate-spin" /> : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RenameStudioButton({ companyId, currentName }: { companyId: string; currentName: string }) {
  const t = useTranslations("contractors");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState(currentName);

  function submit() {
    start(async () => {
      try {
        const r = await renameContractor(companyId, name);
        if (!r.ok) { toast.error(tr(`common.actionErrors.${r.error}` as "common.actionErrors.not_found")); return; }
        toast.success(t("studioRenamed"));
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(tr("common.error"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setName(currentName); setOpen(true); }}
        className="grid size-8 place-items-center rounded-[var(--radius-m)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        title={t("editName")}
      >
        <Pencil className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("editName")}</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button onClick={submit} disabled={pending || name.trim().length < 2}>
              {pending ? <Loader className="size-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteStudioButton({ companyId, studioName, hasProjects }: { companyId: string; studioName: string; hasProjects: boolean }) {
  const t = useTranslations("contractors");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      try {
        const r = await deleteContractor(companyId);
        if (!r.ok) { toast.error(tr(`common.actionErrors.${r.error}` as "common.actionErrors.not_found")); return; }
        toast.success(t("studioDeleted"));
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(tr("common.error"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={hasProjects}
        className="grid size-8 place-items-center rounded-[var(--radius-m)] text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-30"
        title={hasProjects ? t("cannotDeleteHasProjects") : t("deleteStudio")}
      >
        <Trash className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteStudio")}</DialogTitle>
          </DialogHeader>
          <p className="t-small text-[var(--ink-2)]">
            {t("deleteConfirm", { name: studioName })}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={submit} disabled={pending}>
              {pending ? <Loader className="size-4 animate-spin" /> : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
