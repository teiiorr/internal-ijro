import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconLock as Lock, IconInfoCircle as Info } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { getStage } from "@/server/queries/stages";
import { listAssignableUsers } from "@/server/queries/tasks";
import { Card } from "@/components/ui-biib/Card";
import { Section } from "@/components/ui-biib/Section";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { FactList, type Fact } from "@/components/ui-biib/FactList";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { StageDocuments } from "@/components/projects/stage-documents";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { canEditProjects, canViewMoney, MONEY_MASK } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { StagePayments } from "@/components/projects/stage-payments";
import { CompleteStageButton } from "@/components/projects/complete-stage-button";
import { ReopenStageButton } from "@/components/projects/reopen-stage-button";
import { StageReviewBar } from "@/components/projects/stage-review-bar";
import { EditStageDialog } from "@/components/projects/edit-stage-dialog";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { StageProgressBadge } from "@/components/studio/stage-progress";
import { StageRequestsList } from "@/components/studio/stage-requests";
import { getLatestStageProgress, listStageRequests } from "@/server/queries/studio";
import { isOwner } from "@/lib/permissions/owner";

export default async function StageDetailPage({ params }: { params: Promise<{ id: string; stageId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id, stageId } = await params;
  const data = await getStage(stageId, locale);
  if (!data || data.stage.projectId !== id) notFound();

  const me = session.user;
  // Bosqiçni özgartiriş = qat'iy allowlist YOKI owner bergan huquq.
  const canManage = canEditProjects(me.email) || (await hasGrant(me.id, "projects.edit"));
  const canManagePayments = canManage;
  // Byudjet va tölov summalari "money" allowlistidagilarga YOKI huquq berilganlarga körsatiladi.
  const showMoney = canViewMoney(me.email) || (await hasGrant(me.id, "money.view"));
  // "Mas'ul" tanlagiçi uçun tayinlanadigan foydalanuvçilar — faqat menejerlar uçun.
  const assignable = canManage ? await listAssignableUsers(me.id, me.position, me.departmentId) : [];

  const s = data.stage;
  // Studiya hamkorligi: shu bosqich bo'yicha studiya progressi va so'rovlari.
  const [progressMap, stageReqs] = await Promise.all([
    getLatestStageProgress([stageId]),
    listStageRequests({ stageId }),
  ]);
  const studioProgress = progressMap.get(stageId) ?? null;
  const canDecideRequests = canManage || isOwner(me.email);
  const total = data.siblings.length;
  // Faqat eng oxirgi yakunlangan bosqiçni qayta oçiş mumkin (reopenStage'dagi tekşiruvga mos keladi).
  const lastCompleted = [...data.siblings].reverse().find((x) => x.status === "completed");
  const isLastCompleted = s.status === "completed" && lastCompleted?.id === s.id;
  const submitted = s.reviewStatus === "submitted";
  const statusMeta: { tone: StatusTone; label: string } =
    s.status === "completed"
      ? { tone: "success", label: t("projects.stagePath.done") }
      : s.status === "active"
        ? { tone: "info", label: t("projects.stagePath.active") }
        : { tone: "neutral", label: t("projects.stagePath.locked") };

  const facts: Fact[] = [
    ...(s.responsibleName
      ? [{
          term: t("projects.fields.responsible"),
          value: (
            <span className="inline-flex items-center gap-2">
              <UserAvatar name={localizeName(s.responsibleName, locale)} avatarUrl={s.responsibleAvatarUrl} size="xs" clickable={false} />
              <span className="font-semibold">{localizeName(s.responsibleName, locale)}</span>
            </span>
          ),
        } satisfies Fact]
      : []),
    {
      term: t("projects.editStage.endDate"),
      value: (
        <span className="inline-flex flex-wrap items-center gap-2">
          {s.plannedDeadline ? formatDate(s.plannedDeadline, locale) : t("common.emptyValue")}
          {s.status === "active" && s.plannedDeadline && <DeadlineCountdown deadline={s.plannedDeadline} />}
        </span>
      ),
    },
    { term: t("projects.fields.contractNumber"), value: s.contractNumber || t("common.emptyValue") },
    { term: t("projects.editStage.startDate"), value: s.plannedStartDate ? formatDate(s.plannedStartDate, locale) : t("common.emptyValue") },
    {
      term: t("projects.editStage.budget"),
      value: <span className="tabular-nums">{s.plannedAmount != null ? (showMoney ? `${s.plannedAmount.toLocaleString("ru-RU")} UZS` : MONEY_MASK) : t("common.emptyValue")}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        back={<BackButton fallbackHref={`/projects/${id}`} />}
        subtitle={
          <>
            <Link href={`/projects/${id}`} className="hover:underline">{s.projectName}</Link>
            {", "}
            {t("projects.stagePath.stageOf", { n: s.orderIndex + 1, total })}
          </>
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {s.name}
            <Status tone={statusMeta.tone}>{statusMeta.label}</Status>
          </span>
        }
        actions={
          <>
            {canManage && (
              <EditStageDialog
                stage={{ id: s.id, name: s.name, plannedStartDate: s.plannedStartDate, plannedDeadline: s.plannedDeadline, plannedAmount: s.plannedAmount, contractNumber: s.contractNumber, responsibleUserId: s.responsibleUserId }}
                users={assignable}
              />
            )}
            {canManage && isLastCompleted && <ReopenStageButton stageId={s.id} />}
          </>
        }
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        <Card>
          <FactList items={facts} />

          {s.status === "locked" && (
            <p className="mt-5 flex items-center gap-2 t-small text-[var(--ink-3)]">
              <Lock className="size-4 shrink-0" />
              {t("projects.stagePath.lockedHint")}
            </p>
          )}

          {/* Keyingi qadam — bitta aniq amal */}
          {canManage && s.status === "active" && (
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              {submitted ? (
                <StageReviewBar stageId={s.id} reviewStatus={s.reviewStatus} />
              ) : (
                <div className="flex flex-col items-end gap-2">
                  {s.mergeWithNext && (
                    <p className="flex items-center gap-1.5 t-small text-[var(--ink-3)]">
                      <Info className="size-3.5 shrink-0" />
                      {t("projects.stageActions.mergeHint")}
                    </p>
                  )}
                  <CompleteStageButton stageId={s.id} />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Studiya: bajarilish foizi + so'rovlar (muddat / muammo) */}
        {(studioProgress || stageReqs.length > 0) && (
          <Section title={t("conversation.studio")}>
            <Card className="flex flex-col gap-5">
              {studioProgress && <StageProgressBadge data={studioProgress} />}
              {stageReqs.length > 0 && (
                <div className={studioProgress ? "border-t border-[var(--line)] pt-5" : ""}>
                  <StageRequestsList requests={stageReqs} canDecide={canDecideRequests} />
                </div>
              )}
            </Card>
          </Section>
        )}

        {/* Hujjatlar + Tölovlar keng ekranlarda yonma-yon */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
          <Section title={t("projects.stageDocs.title")}>
            <Card solid>
              <StageDocuments stageId={s.id} documents={data.documents} canManage={canManage} suggestions={data.categorySuggestions} maxBytes={MAX_UPLOAD_BYTES} />
            </Card>
          </Section>

          <Section title={t("projects.stagePayments.title")}>
            <Card solid>
              <StagePayments stageId={s.id} payments={data.payments} plannedAmount={s.plannedAmount} canManage={canManagePayments} showMoney={showMoney} />
            </Card>
          </Section>
        </div>
      </div>
    </div>
  );
}
