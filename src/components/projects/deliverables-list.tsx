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
          <div key={d.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <a href={d.fileUrl} className="font-medium hover:underline">{d.fileName}</a>
                <p className="text-xs text-[var(--muted)]">{d.type} · {new Date(d.submittedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={d.status === "approved" ? "success" : d.status === "rejected" ? "danger" : d.status === "revision_requested" ? "warning" : "secondary"}>
                  {d.status}
                </Badge>
                <Button asChild variant="ghost" size="icon"><a href={d.fileUrl}><Download className="size-4" /></a></Button>
              </div>
            </div>
            {d.message && <p className="text-sm">{d.message}</p>}
            {d.adminFeedback && (
              <p className="text-sm rounded bg-[var(--secondary)] p-2"><span className="text-[var(--muted)]">{t("projects.deliverables.feedback")}:</span> {d.adminFeedback}</p>
            )}
            {canReview && d.status === "submitted" && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder={t("projects.deliverables.feedback")}
                  value={feedback[d.id] ?? ""}
                  onChange={(e) => setFeedback((f) => ({ ...f, [d.id]: e.target.value }))}
                  className="flex-1 min-w-[200px] h-9"
                />
                {REVIEW.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === "approved" ? "default" : s === "rejected" ? "destructive" : "outline"}
                    disabled={pending}
                    onClick={() => start(async () => { await reviewDeliverable(d.id, s, feedback[d.id]); })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-[var(--muted)]">{t("projects.deliverables.noDeliverables")}</p>}
      </div>

      {canSubmit && (
        <form onSubmit={onSubmit} className="border rounded-lg p-3 space-y-3">
          <h4 className="font-medium">{t("projects.deliverables.submit")}</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>{t("projects.deliverables.type")}</Label>
              <Select name="type" defaultValue="document">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("projects.deliverables.milestone")}</Label>
              <Select name="milestoneId">
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{milestones.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("projects.deliverables.file")}</Label>
              <Input type="file" ref={fileRef} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("projects.deliverables.message")}</Label>
            <Textarea name="message" rows={2} />
          </div>
          <Button type="submit" disabled={pending}>{t("common.submit")}</Button>
        </form>
      )}
    </div>
  );
}
