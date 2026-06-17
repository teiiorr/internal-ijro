"use client";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { submitDeliverable, reviewDeliverable } from "@/server/actions/projects";

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
      <div className="space-y-2">
        {items.map((d) => (
          <div key={d.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <a href={d.fileUrl} className="font-semibold hover:underline">{d.fileName}</a>
                <p className="text-xs text-[var(--muted)]">{t(`projects.deliverable.types.${d.type}` as "projects.deliverable.types.document")} · {new Date(d.submittedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={d.status === "approved" ? "success" : d.status === "rejected" ? "danger" : d.status === "revision_requested" ? "warning" : "secondary"}>
                  {t(`status.${d.status}` as "status.submitted")}
                </Badge>
                <Button asChild variant="ghost" size="icon-sm"><a href={d.fileUrl}><Download className="size-4" /></a></Button>
              </div>
            </div>
            {d.message && <p className="text-sm">{d.message}</p>}
            {d.adminFeedback && (
              <p className="text-sm rounded-xl bg-[var(--surface-2)] p-3"><span className="text-[var(--muted)] font-medium">{t("projects.deliverables.feedback")}:</span> {d.adminFeedback}</p>
            )}
            {canReview && d.status === "submitted" && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder={t("projects.deliverables.feedback")}
                  value={feedback[d.id] ?? ""}
                  onChange={(e) => setFeedback((f) => ({ ...f, [d.id]: e.target.value }))}
                  className="flex-1 min-w-[200px]"
                />
                {REVIEW.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === "approved" ? "default" : s === "rejected" ? "destructive" : "outline"}
                    disabled={pending}
                    onClick={() => start(async () => { await reviewDeliverable(d.id, s, feedback[d.id]); })}
                  >
                    {t(`status.${s}` as "status.approved")}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-[var(--muted)]">{t("projects.deliverables.noDeliverables")}</p>}
      </div>

      {canSubmit && (
        <form onSubmit={onSubmit} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <h4 className="font-semibold">{t("projects.deliverables.submit")}</h4>
          <div className="grid gap-3 md:grid-cols-3">
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
              <Input type="file" ref={fileRef} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("projects.deliverables.message")}</Label>
            <Textarea name="message" rows={2} />
          </div>
          <Button type="submit" disabled={pending}>{t("common.submit")}</Button>
        </form>
      )}
    </div>
  );
}
