"use client";
import { useTranslations, useLocale } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { IconDownload as Download } from "@tabler/icons-react";
import { submitDeliverable, reviewDeliverable } from "@/server/actions/projects";
import { formatDateTime } from "@/lib/dates";

type D = {
  id: string;
  fileUrl: string;
  fileName: string;
  type: string;
  status: string;
  message: string | null;
  adminFeedback: string | null;
  submittedAt: Date | string;
};

const TYPES = ["document", "video", "image", "archive", "other"] as const;
const REVIEW = ["approved", "revision_requested", "rejected"] as const;

const STATUS_TONE: Record<string, StatusTone> = {
  approved: "success",
  rejected: "danger",
  revision_requested: "warning",
  submitted: "info",
};

export function DeliverablesList({
  projectId,
  items,
  canSubmit,
  canReview,
  milestones,
}: {
  projectId: string;
  items: D[];
  canSubmit: boolean;
  canReview: boolean;
  milestones: { id: string; title: string }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    start(async () => {
      await submitDeliverable({
        projectId,
        milestoneId: (fd.get("milestoneId") as string) || null,
        type: String(fd.get("type") ?? "document"),
        message: (fd.get("message") as string) || null,
        file,
      });
      if (fileRef.current) fileRef.current.value = "";
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {items.map((d) => (
          <li key={d.id} className="space-y-3 py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <a href={d.fileUrl} className="font-semibold text-[var(--ink)] hover:underline">{d.fileName}</a>
                <p className="t-micro text-[var(--ink-3)]">{t(`projects.deliverable.types.${d.type}` as "projects.deliverable.types.document")}, {formatDateTime(d.submittedAt, locale)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Status tone={STATUS_TONE[d.status] ?? "neutral"}>
                  {t(`status.${d.status}` as "status.submitted")}
                </Status>
                <Button asChild variant="ghost" size="icon-sm"><a href={d.fileUrl}><Download className="size-4" /></a></Button>
              </div>
            </div>
            {d.message && <p className="text-sm text-[var(--ink-2)]">{d.message}</p>}
            {d.adminFeedback && (
              <p className="rounded-[var(--radius-s)] bg-[var(--surface-2)] p-3 text-sm text-[var(--ink)]"><span className="font-medium text-[var(--ink-3)]">{t("projects.deliverables.feedback")}:</span> {d.adminFeedback}</p>
            )}
            {canReview && d.status === "submitted" && (
              <div className="space-y-3 pt-2 border-t border-[var(--line)]">
                <Input
                  placeholder={t("projects.deliverables.feedback")}
                  value={feedback[d.id] ?? ""}
                  onChange={(e) => setFeedback((f) => ({ ...f, [d.id]: e.target.value }))}
                />
                <div className="flex justify-end gap-2 flex-wrap">
                  {REVIEW.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "approved" ? "success" : s === "rejected" ? "destructive" : "outline"}
                      disabled={pending}
                      onClick={() => start(async () => { await reviewDeliverable(d.id, s, feedback[d.id]); })}
                    >
                      {t(`status.${s}` as "status.approved")}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="py-4 t-small text-[var(--ink-3)]">{t("projects.deliverables.noDeliverables")}</li>}
      </ul>

      {canSubmit && (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-[var(--line)] pt-4">
          <h4 className="t-h3 text-[var(--ink)]">{t("projects.deliverables.submit")}</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("projects.deliverables.type")}</Label>
              <Select name="type" defaultValue="document">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(`projects.deliverable.types.${ty}` as "projects.deliverable.types.document")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("projects.deliverables.milestone")}</Label>
              <Select name="milestoneId">
                <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
                <SelectContent>{milestones.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("projects.deliverables.file")}</Label>
              <FileInput ref={fileRef} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("projects.deliverables.message")}</Label>
            <Textarea name="message" rows={2} />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={pending}>{t("common.submit")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
