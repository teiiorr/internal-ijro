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
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { formatDate, timeAgo } from "@/lib/dates";
import { createStageRequest, decideStageRequest } from "@/server/actions/studio";
import { studioErrorKey } from "./errors";

type ReqType = "deadline" | "blocker";

/** Studiya: bosqich boʻyicha muddatni uzaytirish yoki muammo bildirish. */
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={() => setOpen("deadline")} className="justify-start">
          <CalendarPlus className="size-4 text-[var(--tint)]" /> {t("studio.requests.deadlineBtn")}
        </Button>
        <Button variant="outline" onClick={() => setOpen("blocker")} className="justify-start">
          <Alert className="size-4 text-[var(--warning)]" /> {t("studio.requests.blockerBtn")}
        </Button>
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open === "deadline" ? t("studio.requests.deadlineTitle") : t("studio.requests.blockerTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {open === "deadline" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("studio.requests.currentDeadline")}</Label>
                  <p className="flex h-11 items-center rounded-[var(--radius-m)] bg-[var(--surface-2)] px-3 text-sm font-semibold text-[var(--ink)]">
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
  pending: "warning",
  approved: "success",
  resolved: "success",
  rejected: "danger",
};

/** Soʻrovlar — ajratuvchi qatorlar (quti emas). `canDecide` boʻlsa (xodim) — qaror tugmalari. */
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
    return <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("studio.requests.empty")}</p>;
  }
  return (
    <ul className="divide-y divide-[var(--line)]">
      {requests.map((r) => (
        <li key={r.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            {r.type === "deadline"
              ? <Calendar className="size-4 shrink-0 text-[var(--tint)]" aria-hidden />
              : <Alert className="size-4 shrink-0 text-[var(--warning)]" aria-hidden />}
            <span className="text-sm font-bold text-[var(--ink)]">{t(`studio.requests.types.${r.type}`)}</span>
            {r.status === "pending" ? (
              <Status tone={STATUS_TONE[r.status]} dot>{t(`studio.requests.statuses.${r.status}`)}</Status>
            ) : (
              <Status tone={STATUS_TONE[r.status]}>{t(`studio.requests.statuses.${r.status}`)}</Status>
            )}
            <span className="ml-auto t-micro text-[var(--ink-3)]">{timeAgo(r.createdAt, locale)}</span>
          </div>

          {(showProject || r.studioName) && (
            <p className="mt-1.5 t-small text-[var(--ink-3)]">
              {r.studioName && <span className="font-semibold text-[var(--ink)]">{r.studioName}</span>}
              {r.studioName && showProject && ", "}
              {showProject && (linkBase ? (
                <Link href={`${linkBase}/${r.projectId}/stages/${r.stageId}`} className="hover:text-[var(--ink)] hover:underline">
                  {r.projectName}, {r.stageName}
                </Link>
              ) : `${r.projectName}, ${r.stageName}`)}
            </p>
          )}

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink)]">{r.message}</p>

          {r.type === "deadline" && r.requestedDeadline && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ink-2)]">
              {r.currentDeadline ? formatDate(r.currentDeadline, locale) : "—"}
              <Arrow className="size-3.5 text-[var(--ink-3)]" aria-hidden />
              <span className="text-[var(--tint)]">{formatDate(r.requestedDeadline, locale)}</span>
            </p>
          )}

          {r.requestedByName && <p className="mt-1.5 t-micro text-[var(--ink-3)]">{r.requestedByName}</p>}

          {r.status !== "pending" && r.decisionNote && (
            <p className="mt-2 border-l-2 border-[var(--line)] pl-3 t-small italic text-[var(--ink-3)]">{r.decisionNote}</p>
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
    <div className="mt-3 space-y-2">
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
