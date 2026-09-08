import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconLock as Lock, IconCalendarClock as CalendarClock } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, projects } from "@/lib/db/schema";
import { getStage } from "@/server/queries/stages";
import { getStageMessages } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { StageDocuments } from "@/components/projects/stage-documents";
import { StudioStageUpload } from "@/components/contractor/studio-stage-upload";
import { StageSubmitButton } from "@/components/contractor/stage-submit-button";
import { ProjectChat } from "@/components/projects/project-chat";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { eq } from "drizzle-orm";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";

export default async function ContractorStageDetailPage({ params }: { params: Promise<{ id: string; stageId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id, stageId } = await params;

  const [myCompany] = await db
    .select({ id: externalCompanies.id })
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, session.user.email))
    .limit(1);
  if (!myCompany) notFound();

  const [projectRow] = await db
    .select({ externalCompanyId: projects.externalCompanyId })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!projectRow || projectRow.externalCompanyId !== myCompany.id) notFound();

  const data = await getStage(stageId, locale);
  if (!data || data.stage.projectId !== id) notFound();

  const s = data.stage;
  const total = data.siblings.length;
  // Review-aware badge: while active it reflects whose turn it is.
  const statusMeta: { tone: StatusTone; label: string } =
    s.status === "completed"
      ? { tone: "green", label: t("review.status.accepted") }
      : s.status === "locked"
        ? { tone: "red", label: t("projects.stagePath.locked") }
        : s.reviewStatus === "submitted"
          ? { tone: "muted", label: t("review.status.submitted") }
          : s.reviewStatus === "changes_requested"
            ? { tone: "red", label: t("review.status.changes_requested") }
            : { tone: "amber", label: t("review.status.in_progress") };

  const messages = await getStageMessages(id, stageId);
  const locked = s.status === "locked";
  const changesRequested = s.status === "active" && s.reviewStatus === "changes_requested";

  return (
    <div className="space-y-5">
      {/* Header — title + status, deadline as the first big fact */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <BackButton fallbackHref={`/contractor/projects/${id}`} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--muted)]">
                <Link href={`/contractor/projects/${id}`} className="hover:underline">{s.projectName}</Link>
                {" · "}
                {t("projects.stagePath.stageOf", { n: s.orderIndex + 1, total })}
              </p>
              <h1 className="mt-1 text-xl font-bold leading-snug tracking-tight break-words sm:text-2xl">{s.name}</h1>
            </div>
            <StatusTag tone={statusMeta.tone}>{statusMeta.label}</StatusTag>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4 text-sm">
            <CalendarClock className="size-4 shrink-0 text-[var(--muted)]" />
            <span className="font-semibold">
              {s.plannedDeadline ? formatDate(s.plannedDeadline, locale) : t("projects.stageDeadline.notSet")}
            </span>
            {s.status === "active" && s.plannedDeadline && <DeadlineCountdown deadline={s.plannedDeadline} />}
          </div>

          {(s.plannedStartDate || s.contractNumber) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--muted)]">
              {s.plannedStartDate && (
                <span>{t("projects.editStage.startDate")}: <span className="font-semibold text-[var(--foreground)]">{formatDate(s.plannedStartDate, locale)}</span></span>
              )}
              {s.contractNumber && (
                <span>{t("projects.fields.contractNumber")}: <span className="font-semibold text-[var(--foreground)]">{s.contractNumber}</span></span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* What BKRM expects this stage */}
      {s.requirements && (
        <Card>
          <CardContent className="space-y-2 p-5 sm:p-6">
            <h3 className="text-base font-semibold">{t("review.requirements")}</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{s.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Changes requested — what to fix, then resubmit */}
      {changesRequested && s.reviewNote && (
        <Card className="border-[var(--danger)]/45">
          <CardContent className="space-y-1 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <StatusTag tone="red" size="sm">{t("review.changesRequestedTitle")}</StatusTag>
              {s.reviewedAt && <span className="text-xs text-[var(--muted)]">{formatDate(s.reviewedAt, locale)}</span>}
            </div>
            <p className="whitespace-pre-wrap pt-1 text-sm leading-relaxed">{s.reviewNote}</p>
          </CardContent>
        </Card>
      )}

      {/* Submit your work — add files, then hand off for review */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h3 className="text-base font-semibold">{t("projects.stageDocs.title")}</h3>
          {locked ? (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--muted)]">
              <Lock className="size-4 shrink-0" />
              {t("projects.stagePath.lockedHint")}
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="sm:flex-1"><StageSubmitButton stageId={s.id} reviewStatus={s.reviewStatus} fullWidth /></div>
              <StudioStageUpload projectId={id} stageId={s.id} maxBytes={MAX_UPLOAD_BYTES} size="lg" label={t("review.addFile")} />
            </div>
          )}
          <StageDocuments stageId={s.id} documents={data.documents} canManage={false} suggestions={data.categorySuggestions} maxBytes={MAX_UPLOAD_BYTES} />
        </CardContent>
      </Card>

      {/* Chat with your curator, scoped to this stage */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h3 className="text-base font-semibold">{t("projects.tabs.chat")}</h3>
          <ProjectChat projectId={id} stageId={stageId} currentUserId={session.user.id} currentUserName={session.user.fullName} messages={messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))} />
        </CardContent>
      </Card>
    </div>
  );
}
