"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconCalendarPlus as CalendarPlus,
  IconAlertTriangle as Alert,
  IconCalendarEvent as Calendar,
  IconArrowRight as Arrow,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { formatDate, timeAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { createStageRequest, decideStageRequest } from "@/server/actions/studio";
import { studioErrorKey } from "./errors";

type ReqType = "deadline" | "blocker";

/** Studiya: bosqich bo'yicha muddatni uzaytirish yoki muammo bildirish. */
export function StageRequestButtons({ stageId, currentDeadline }: { stageId: string; currentDeadline: string | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState<ReqType | null>(null);
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  // Yangi muddat: bugundan va joriy muddatdan keyin.
  const today = new Date().toISOString().slice(0, 10);
  const minDate = (() => {
    if (!currentDeadline) return today;
    const d = new Date(`${currentDeadline}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().slice(0, 10);
    return next > today ? next : today;
  })();

  function close() { setOpen(null); setDate(""); setMessage(""); }

  function submit() {
    if (!open) return;
    start(async () => {
      try {
        await createStageRequest({ stageId, type: open, message, requestedDeadline: open === "deadline" ? date : undefined });
        toast.success(t("studio.requests.sent"));
        close();
        router.refresh();
      } catch (e) {
        toast.error(t(studioErrorKey(e)));
      }
    });
  }

  const valid = message.trim().length >= 3 && (open !== "deadline" || !!date);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={() => setOpen("deadline")} className="justify-start">
          <CalendarPlus className="size-4 text-[var(--primary)]" /> {t("studio.requests.deadlineBtn")}
        </Button>
        <Button variant="outline" onClick={() => setOpen("blocker")} className="justify-start">
          <Alert className="size-4 text-[#E08C10]" /> {t("studio.requests.blockerBtn")}
        </Button>
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open === "deadline" ? t("studio.requests.deadlineTitle") : t("studio.requests.blockerTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {open === "deadline" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("studio.requests.currentDeadline")}</Label>
                  <p className="flex h-11 items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-semibold">
                    {currentDeadline ? formatDate(currentDeadline, locale) : "—"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="req-date">{t("studio.requests.newDeadline")}</Label>
                  <Input id="req-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="req-msg">{t("studio.requests.reason")}</Label>
              <Textarea
                id="req-msg"
                rows={4}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={open === "deadline" ? t("studio.requests.reasonDeadline") : t("studio.requests.reasonBlocker")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={pending}>{t("studio.currentStatus.cancel")}</Button>
              <Button onClick={submit} disabled={pending || !valid}>{t("studio.requests.send")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type RequestItem = {
  id: string;
  projectId: string;
  projectName: string;
  stageId: string;
  stageName: string;
  type: ReqType;
  status: "pending" | "approved" | "rejected" | "resolved";
  message: string;
  requestedDeadline: string | null;
  currentDeadline: string | null;
  requestedByName: string | null;
  decisionNote: string | null;
  decidedAt: Date | string | null;
  createdAt: Date | string;
  studioName?: string | null;
};

const STATUS_TONE: Record<RequestItem["status"], StatusTone> = {
  pending: "amber",
  approved: "green",
  resolved: "green",
  rejected: "red",
};

/** So'rovlar ro'yxati. `canDecide` bo'lsa (xodim) — tasdiqlash / rad etish / hal qilindi tugmalari. */
export function StageRequestsList({
  requests,
  canDecide = false,
  showProject = false,
  linkBase,
}: {
  requests: RequestItem[];
  canDecide?: boolean;
  showProject?: boolean;
  /** Loyiha/bosqich havolasi uchun asos: "/projects" (xodim) yoki "/contractor/projects" (studiya). */
  linkBase?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  if (requests.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--muted)]">{t("studio.requests.empty")}</p>;
  }
  return (
    <ul className="space-y-3">
      {requests.map((r) => (
        <li
          key={r.id}
          className={cn(
            "rounded-2xl border p-4",
            r.status === "pending"
              ? r.type === "blocker" ? "border-[#E08C10]/40 bg-[#E08C10]/[0.06]" : "border-[var(--primary)]/30 bg-[var(--primary-soft)]"
              : "border-[var(--border)]"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {r.type === "deadline" ? <Calendar className="size-4 text-[var(--primary)]" /> : <Alert className="size-4 text-[#E08C10]" />}
            <span className="text-sm font-bold">{t(`studio.requests.types.${r.type}`)}</span>
            <StatusTag tone={STATUS_TONE[r.status]} size="sm">{t(`studio.requests.statuses.${r.status}`)}</StatusTag>
            <span className="ml-auto text-xs text-[var(--subtle)]">{timeAgo(r.createdAt, locale)}</span>
          </div>

          {(showProject || r.studioName) && (
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              {r.studioName && <span className="font-semibold text-[var(--foreground)]">{r.studioName}</span>}
              {r.studioName && showProject && " · "}
              {showProject && (linkBase ? (
                <Link href={`${linkBase}/${r.projectId}/stages/${r.stageId}`} className="hover:underline">
                  {r.projectName} · {r.stageName}
                </Link>
              ) : `${r.projectName} · ${r.stageName}`)}
            </p>
          )}

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{r.message}</p>

          {r.type === "deadline" && r.requestedDeadline && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold">
              {r.currentDeadline ? formatDate(r.currentDeadline, locale) : "—"}
              <Arrow className="size-3.5 text-[var(--muted)]" />
              <span className="text-[var(--primary)]">{formatDate(r.requestedDeadline, locale)}</span>
            </p>
          )}

          {r.requestedByName && <p className="mt-1.5 text-[11px] text-[var(--subtle)]">{r.requestedByName}</p>}

          {r.status !== "pending" && r.decisionNote && (
            <p className="mt-2 border-l-2 border-[var(--border)] pl-3 text-xs italic text-[var(--muted)]">{r.decisionNote}</p>
          )}

          {canDecide && r.status === "pending" && <DecisionControls request={r} />}
        </li>
      ))}
    </ul>
  );
}

function DecisionControls({ request }: { request: RequestItem }) {
  const t = useTranslations();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function decide(decision: "approved" | "rejected" | "resolved") {
    start(async () => {
      try {
        await decideStageRequest({ requestId: request.id, decision, note: note.trim() || undefined });
        toast.success(t("studio.requests.decided"));
        router.refresh();
      } catch (e) {
        toast.error(t(studioErrorKey(e)));
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
      <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={t("studio.requests.decisionNote")} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => decide("rejected")} disabled={pending}>
          {t("studio.requests.reject")}
        </Button>
        {request.type === "deadline" ? (
          <Button size="sm" onClick={() => decide("approved")} disabled={pending}>{t("studio.requests.approve")}</Button>
        ) : (
          <Button size="sm" onClick={() => decide("resolved")} disabled={pending}>{t("studio.requests.resolve")}</Button>
        )}
      </div>
    </div>
  );
}
