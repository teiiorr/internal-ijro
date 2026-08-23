import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconLock as Lock } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, projects } from "@/lib/db/schema";
import { getStage } from "@/server/queries/stages";
import { getStageMessages } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { StageDocuments } from "@/components/projects/stage-documents";
import { StagePayments } from "@/components/projects/stage-payments";
import { ProjectChat } from "@/components/projects/project-chat";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
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
  const statusMeta =
    s.status === "completed"
      ? { tone: "green" as StatusTone, label: t("projects.stagePath.done") }
      : s.status === "active"
        ? { tone: "amber" as StatusTone, label: t("projects.stagePath.active") }
        : { tone: "red" as StatusTone, label: t("projects.stagePath.locked") };

  const messages = await getStageMessages(id, stageId);

  return (
    <div className="space-y-6">
      {/* Unified stage header + schedule/budget — one combined card. */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Balanced header bar: back + title (left) on one row. */}
          <div className="flex items-start gap-3 sm:gap-4">
            <BackButton fallbackHref={`/contractor/projects/${id}`} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--muted)]">
                <Link href={`/contractor/projects/${id}`} className="hover:underline">{s.projectName}</Link>
                {" · "}
                {t("projects.stagePath.stageOf", { n: s.orderIndex + 1, total })}
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight leading-snug break-words sm:text-2xl">{s.name}</h1>
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* All stage facts as one uniform horizontal row of cards. */}
          <dl className="detail-grid grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("common.status")}</dt>
              <dd className="mt-1 flex justify-center"><StatusTag tone={statusMeta.tone}>{statusMeta.label}</StatusTag></dd>
            </div>
            {s.responsibleName && (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.responsible")}</dt>
                <dd className="mt-1 flex items-center justify-center gap-1.5">
                  <UserAvatar name={localizeName(s.responsibleName, locale)} avatarUrl={s.responsibleAvatarUrl} size="xs" clickable={false} />
                  <span className="truncate font-semibold">{localizeName(s.responsibleName, locale)}</span>
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
              <dd className="font-semibold mt-1 tabular-nums whitespace-nowrap">{s.plannedAmount != null ? `${s.plannedAmount.toLocaleString("ru-RU")} UZS` : t("common.emptyValue")}</dd>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("projects.stageDocs.title")}</h3>
            <StageDocuments stageId={s.id} documents={data.documents} canManage={false} suggestions={data.categorySuggestions} maxBytes={MAX_UPLOAD_BYTES} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("projects.stagePayments.title")}</h3>
            <StagePayments stageId={s.id} payments={data.payments} plannedAmount={s.plannedAmount} canManage={false} showMoney={true} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold">{t("projects.tabs.chat")}</h3>
          <ProjectChat projectId={id} stageId={stageId} currentUserId={session.user.id} currentUserName={session.user.fullName} messages={messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))} />
        </CardContent>
      </Card>
    </div>
  );
}
