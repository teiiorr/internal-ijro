"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconListDetails, IconLoader2 } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { saveDocMeta } from "@/server/actions/normative-ack";
import { NativeSelect } from "./native-select";
import { DOC_TYPES, errorKey, isDocType, type DocMeta, type DocStatus, type DocType } from "./logic";

type Form = {
  docType: DocType | "";
  docNumber: string;
  docDate: string;
  issuedBy: string;
  status: DocStatus;
  supersedesId: string;
  summary: string;
};

function initialForm(meta: Partial<DocMeta> | null | undefined, supersedesId: string | null | undefined): Form {
  return {
    docType: isDocType(meta?.docType) ? meta.docType : "",
    docNumber: meta?.docNumber ?? "",
    docDate: meta?.docDate ?? "",
    issuedBy: meta?.issuedBy ?? "",
    status: meta?.status === "repealed" ? "repealed" : "active",
    supersedesId: supersedesId ?? "",
    summary: meta?.summary ?? "",
  };
}

/**
 * "Rekvizitlar" dialog: type, number, date, issuing body, in force / repealed,
 * "Quyidagi hujjat oʻrniga" (this document replaces …) and a short summary.
 */
export function DocMetaDialog({
  doc,
  otherDocs,
  supersedesId,
}: {
  doc: { id: string; fileName: string; meta?: Partial<DocMeta> | null };
  /** Every other registry document (candidates for "replaces"). */
  otherDocs: { id: string; fileName: string }[];
  /** The document this one currently replaces, if any. */
  supersedesId?: string | null;
}) {
  const t = useTranslations("staffX.normativeAck");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState<Form>(() => initialForm(doc.meta, supersedesId));
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const idp = `meta-${doc.id.slice(0, 8)}`;

  function onOpenChange(next: boolean) {
    // Re-read the latest saved values every time the dialog opens (no effect needed).
    if (next) setForm(initialForm(doc.meta, supersedesId));
    setOpen(next);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const res = await saveDocMeta({
          documentId: doc.id,
          docType: form.docType || null,
          docNumber: form.docNumber,
          docDate: form.docDate || null,
          issuedBy: form.issuedBy,
          status: form.status,
          summary: form.summary,
          // Unchanged → undefined, so the server leaves existing "supersedes" links untouched.
          supersedesId: form.supersedesId === (supersedesId ?? "") ? undefined : form.supersedesId || null,
        });
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        toast.success(tc("saved"));
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  const candidates = otherDocs.filter((d) => d.id !== doc.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <IconListDetails className="size-4" />
          {t("details")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1.5rem)] max-h-[85vh] gap-4 overflow-y-auto p-5 sm:max-w-xl sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <IconListDetails className="size-5 shrink-0 text-[var(--tint)]" />
            <span className="min-w-0 break-words">{t("details")}</span>
          </DialogTitle>
          <DialogDescription className="break-words [overflow-wrap:anywhere]">{doc.fileName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${idp}-type`}>{t("docType")}</Label>
              <NativeSelect
                id={`${idp}-type`}
                value={form.docType}
                onChange={(e) => set({ docType: isDocType(e.target.value) ? e.target.value : "" })}
              >
                <option value="">{t("notSelected")}</option>
                {DOC_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t(`type.${ty}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${idp}-num`}>{t("docNumber")}</Label>
              <Input
                id={`${idp}-num`}
                value={form.docNumber}
                onChange={(e) => set({ docNumber: e.target.value })}
                maxLength={60}
                placeholder="45"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${idp}-date`}>{t("docDate")}</Label>
              <Input
                id={`${idp}-date`}
                type="date"
                value={form.docDate}
                onChange={(e) => set({ docDate: e.target.value })}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${idp}-by`}>{t("issuedBy")}</Label>
              <Input
                id={`${idp}-by`}
                value={form.issuedBy}
                onChange={(e) => set({ issuedBy: e.target.value })}
                maxLength={255}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("status")}</Label>
            <div role="radiogroup" aria-label={t("status")} className="grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-[var(--surface-2)] p-1">
              {(["active", "repealed"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={form.status === st}
                  onClick={() => set({ status: st })}
                  className={cn(
                    "min-h-10 rounded-[calc(var(--radius-control)-4px)] px-2 py-1.5 text-sm font-semibold transition-colors",
                    form.status === st
                      ? st === "active"
                        ? "bg-[var(--success)] text-[var(--on-tint)] shadow-[var(--shadow-1)]"
                        : "bg-[var(--danger)] text-[var(--on-tint)] shadow-[var(--shadow-1)]"
                      : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                  )}
                >
                  {st === "active" ? t("statusActive") : t("statusRepealed")}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label htmlFor={`${idp}-sup`}>{t("supersedes")}</Label>
            <NativeSelect
              id={`${idp}-sup`}
              value={form.supersedesId}
              onChange={(e) => set({ supersedesId: e.target.value })}
            >
              <option value="">{t("notSelected")}</option>
              {candidates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName.length > 90 ? `${d.fileName.slice(0, 89)}…` : d.fileName}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-[var(--muted)]">{t("supersedesHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idp}-sum`}>{t("summary")}</Label>
            <Textarea
              id={`${idp}-sum`}
              value={form.summary}
              onChange={(e) => set({ summary: e.target.value })}
              maxLength={5000}
              className="min-h-[96px]"
            />
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending} className="w-full sm:w-auto">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending && <IconLoader2 className="size-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
