import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconLock as Lock, IconInfoCircle as Info } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { getStage } from "@/server/queries/stages";
import { listAssignableUsers } from "@/server/queries/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { StageDocuments } from "@/components/projects/stage-documents";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { canEditProjects, canViewMoney, MONEY_MASK } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { StagePayments } from "@/components/projects/stage-payments";
import { CompleteStageButton } from "@/components/projects/complete-stage-button";
import { ReopenStageButton } from "@/components/projects/reopen-stage-button";
import { EditStageDialog } from "@/components/projects/edit-stage-dialog";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";

export default async function StageDetailPage({ params }: { params: Promise<{ id: string; stageId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id, stageId } = await params;
  const data = await getStage(stageId, locale);
  if (!data || data.stage.projectId !== id) notFound();

  const me = session.user;
  // Stage changes = the fixed allowlist OR an owner-granted capability.
  const canManage = canEditProjects(me.email) || (await hasGrant(me.id, "projects.edit"));
  const canManagePayments = canManage;
  // Budgets & payment sums shown to the money allowlist OR granted users.
  const showMoney = canViewMoney(me.email) || (await hasGrant(me.id, "money.view"));
  // Assignable users for the "Mas'ul" (responsible) picker — managers only.
  const assignable = canManage ? await listAssignableUsers(me.id, me.position, me.departmentId) : [];

  const s = data.stage;
  const total = data.siblings.length;
  // Only the most-recently completed stage can be un-completed (matches reopenStage's guard).
  const lastCompleted = [...data.siblings].reverse().find((x) => x.status === "completed");
  const isLastCompleted = s.status === "completed" && lastCompleted?.id === s.id;
  const statusMeta =
    s.status === "completed"
      ? { tone: "green" as StatusTone, label: t("projects.stagePath.done") }
      : s.status === "active"
        ? { tone: "amber" as StatusTone, label: t("projects.stagePath.active") }
        : { tone: "red" as StatusTone, label: t("projects.stagePath.locked") };

  return (
    <div className="space-y-6">
      {/* Unified stage header + schedule/budget — one combined card. */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Balanced header bar: back + title (left) + edit (right) on one row. */}
          <div className="flex items-start gap-3 sm:gap-4">
            <BackButton fallbackHref={`/projects/${id}`} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--muted)]">
                <Link href={`/projects/${id}`} className="hover:underline">{s.projectName}</Link>
                {" · "}
                {t("projects.stagePath.stageOf", { n: s.orderIndex + 1, total })}
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight leading-snug break-words sm:text-2xl">{s.name}</h1>
            </div>
            {canManage && (
              <div className="shrink-0">
                <EditStageDialog
                  stage={{ id: s.id, name: s.name, plannedStartDate: s.plannedStartDate, plannedDeadline: s.plannedDeadline, plannedAmount: s.plannedAmount, contractNumber: s.contractNumber, responsibleUserId: s.responsibleUserId }}
                  users={assignable}
                />
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* All stage facts as one uniform horizontal row of cards. Active stage ticks a live countdown. */}
          <dl className="detail-grid grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("common.status")}</dt>
              <dd className="mt-1 flex justify-center"><StatusTag tone={statusMeta.tone}>{statusMeta.label}</StatusTag></dd>
            </div>
            {s.responsibleName && (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.responsible")}</dt>
                <dd className="mt-1 flex flex-col items-center gap-1">
                  <UserAvatar name={localizeName(s.responsibleName, locale)} avatarUrl={s.responsibleAvatarUrl} size="xs" clickable={false} />
                  <span className="font-semibold leading-tight break-words">{localizeName(s.responsibleName, locale)}</span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.contractNumber")}</dt>
              <dd className="font-semibold mt-1 break-words">{s.contractNumber || t("common.emptyValue")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.editStage.startDate")}</dt>
              <dd className="font-semibold mt-1">{s.plannedStartDate ? formatDate(s.plannedStartDate, locale) : t("common.emptyValue")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.editStage.endDate")}</dt>
              <dd className="font-semibold mt-1 flex flex-wrap items-center justify-center gap-2">
                <span>{s.plannedDeadline ? formatDate(s.plannedDeadline, locale) : t("common.emptyValue")}</span>
                {s.status === "active" && s.plannedDeadline && <DeadlineCountdown deadline={s.plannedDeadline} />}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.editStage.budget")}</dt>
              <dd className="font-semibold mt-1 tabular-nums whitespace-nowrap">{s.plannedAmount != null ? (showMoney ? `${s.plannedAmount.toLocaleString("ru-RU")} UZS` : MONEY_MASK) : t("common.emptyValue")}</dd>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("projects.stageDocs.title")}</h3>
            <StageDocuments stageId={s.id} documents={data.documents} canManage={canManage} suggestions={data.categorySuggestions} maxBytes={MAX_UPLOAD_BYTES} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("projects.stagePayments.title")}</h3>
            <StagePayments stageId={s.id} payments={data.payments} plannedAmount={s.plannedAmount} canManage={canManagePayments} showMoney={showMoney} />
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
