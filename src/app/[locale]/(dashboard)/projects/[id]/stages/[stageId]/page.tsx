import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2, CheckCircle2, User, Info } from "lucide-react";
import { auth } from "@/lib/auth";
import { getStage } from "@/server/queries/stages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { StageDocuments } from "@/components/projects/stage-documents";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { StagePayments } from "@/components/projects/stage-payments";
import { CompleteStageButton } from "@/components/projects/complete-stage-button";
import { ReopenStageButton } from "@/components/projects/reopen-stage-button";
import { EditStageDialog } from "@/components/projects/edit-stage-dialog";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";

export default async function StageDetailPage({ params }: { params: Promise<{ id: string; stageId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id, stageId } = await params;
  const data = await getStage(stageId, locale);
  if (!data || data.stage.projectId !== id) notFound();

  const me = session.user;
  // Stage changes restricted to the fixed project-editor allowlist.
  const canManage = canEditProjects(me.email);
  const canManagePayments = canManage;

  const s = data.stage;
  const total = data.siblings.length;
  // Only the most-recently completed stage can be un-completed (matches reopenStage's guard).
  const lastCompleted = [...data.siblings].reverse().find((x) => x.status === "completed");
  const isLastCompleted = s.status === "completed" && lastCompleted?.id === s.id;
  const statusMeta =
    s.status === "completed"
      ? { tone: "green" as StatusTone, icon: <CheckCircle2 className="size-3.5" />, label: t("projects.stagePath.done") }
      : s.status === "active"
        ? { tone: "amber" as StatusTone, icon: <Loader2 className="size-3.5" />, label: t("projects.stagePath.active") }
        : { tone: "red" as StatusTone, icon: <Lock className="size-3.5" />, label: t("projects.stagePath.locked") };

  return (
    <div className="space-y-6">
      {/* header (full width) */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon-sm" className="mt-0.5 shrink-0">
          <Link href={`/projects/${id}`}><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--muted)]">
            <Link href={`/projects/${id}`} className="hover:underline">{s.projectName}</Link>
            {" · "}
            {t("projects.stagePath.stageOf", { n: s.orderIndex + 1, total })}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug break-words mt-1">{s.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
            <StatusTag tone={statusMeta.tone}>{statusMeta.icon}{statusMeta.label}</StatusTag>
            {s.responsibleName && (
              <span className="text-[var(--muted)] inline-flex items-center gap-1"><User className="size-3.5" />{s.responsibleName}</span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="shrink-0">
            <EditStageDialog
              stage={{ id: s.id, name: s.name, plannedStartDate: s.plannedStartDate, plannedDeadline: s.plannedDeadline, plannedAmount: s.plannedAmount }}
            />
          </div>
        )}
      </div>

      {/* Schedule + budget — read-only; edit via the pencil above. Active stage ticks a live countdown. */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-3">
          <h3 className="text-base font-semibold">{t("projects.editStage.scheduleTitle")}</h3>
          <dl className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.editStage.startDate")}</dt>
              <dd className="font-semibold mt-0.5">{s.plannedStartDate ? formatDate(s.plannedStartDate) : t("common.emptyValue")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.editStage.endDate")}</dt>
              <dd className="font-semibold mt-0.5 flex flex-wrap items-center gap-2">
                <span>{s.plannedDeadline ? formatDate(s.plannedDeadline) : t("common.emptyValue")}</span>
                {s.status === "active" && s.plannedDeadline && <DeadlineCountdown deadline={s.plannedDeadline} />}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.editStage.budget")}</dt>
              <dd className="font-semibold mt-0.5 tabular-nums">{s.plannedAmount != null ? `${s.plannedAmount.toLocaleString("ru-RU")} UZS` : t("common.emptyValue")}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {s.status === "locked" && (
        <Card>
          <CardContent className="p-5 flex items-center gap-3 text-sm text-[var(--muted)]">
            <Lock className="size-4 shrink-0" />
            {t("projects.stagePath.lockedHint")}
          </CardContent>
        </Card>
      )}

      {/* Documents + Payments side by side on wide screens, stacked on mobile */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("projects.stageDocs.title")}</h3>
            <StageDocuments stageId={s.id} documents={data.documents} canManage={canManage} suggestions={data.categorySuggestions} maxBytes={MAX_UPLOAD_BYTES} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("projects.stagePayments.title")}</h3>
            <StagePayments stageId={s.id} payments={data.payments} plannedAmount={s.plannedAmount} canManage={canManagePayments} />
          </CardContent>
        </Card>
      </div>

      {/* primary action — bottom right */}
      {canManage && s.status === "active" && (
        <div className="flex flex-col items-end gap-2 pt-1">
          {s.mergeWithNext && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Info className="size-3.5 shrink-0" />
              {t("projects.stageActions.mergeHint")}
            </p>
          )}
          <CompleteStageButton stageId={s.id} />
        </div>
      )}

      {/* Undo an accidental completion — only the last completed stage */}
      {canManage && isLastCompleted && (
        <div className="flex justify-end pt-1">
          <ReopenStageButton stageId={s.id} />
        </div>
      )}
    </div>
  );
}
