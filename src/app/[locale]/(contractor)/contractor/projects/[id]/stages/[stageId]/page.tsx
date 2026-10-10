import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconLock as Lock } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, projects } from "@/lib/db/schema";
import { getStage } from "@/server/queries/stages";
import { getStageMessages } from "@/server/queries/projects";
import { Card } from "@/components/ui-biib/Card";
import { Section } from "@/components/ui-biib/Section";
import { Heading } from "@/components/ui-biib/Heading";
import { FactList } from "@/components/ui-biib/FactList";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { StageDocuments } from "@/components/projects/stage-documents";
import { StudioStageUpload } from "@/components/contractor/studio-stage-upload";
import { StageSubmitButton } from "@/components/contractor/stage-submit-button";
import { ProjectChat } from "@/components/projects/project-chat";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { eq } from "drizzle-orm";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { StageProgressReporter } from "@/components/studio/stage-progress";
import { StageRequestButtons, StageRequestsList } from "@/components/studio/stage-requests";
import { getLatestStageProgress, listStageRequests } from "@/server/queries/studio";

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
  // Koʻrib chiqishni hisobga oluvchi belgi: faol paytda navbat kimdaligini koʻrsatadi.
  const statusMeta: { tone: StatusTone; label: string } =
    s.status === "completed"
      ? { tone: "success", label: t("review.status.accepted") }
      : s.status === "locked"
        ? { tone: "neutral", label: t("projects.stagePath.locked") }
        : s.reviewStatus === "submitted"
          ? { tone: "info", label: t("review.status.submitted") }
          : s.reviewStatus === "changes_requested"
            ? { tone: "danger", label: t("review.status.changes_requested") }
            : { tone: "warning", label: t("review.status.in_progress") };

  const [messages, progressMap, requests] = await Promise.all([
    getStageMessages(id, stageId),
    getLatestStageProgress([stageId]),
    listStageRequests({ stageId }),
  ]);
  const latestProgress = progressMap.get(stageId) ?? null;
  const locked = s.status === "locked";
  const changesRequested = s.status === "active" && s.reviewStatus === "changes_requested";

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      {/* Sarlavha — havolali sarh + nom + holat, oʻngda asosiy amal (koʻrib chiqishga yuborish) */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <BackButton fallbackHref={`/contractor/projects/${id}`} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="t-small text-[var(--ink-3)]">
              <Link href={`/contractor/projects/${id}`} className="hover:text-[var(--ink)] hover:underline">{s.projectName}</Link>
              {", "}
              {t("projects.stagePath.stageOf", { n: s.orderIndex + 1, total })}
            </p>
            <Heading level={1} trim className="mt-1 break-words">{s.name}</Heading>
            <div className="mt-2"><Status tone={statusMeta.tone}>{statusMeta.label}</Status></div>
          </div>
        </div>
        {!locked && (
          <div className="shrink-0 max-sm:w-full">
            <StageSubmitButton stageId={s.id} reviewStatus={s.reviewStatus} size="default" />
          </div>
        )}
      </header>

      {/* Asosiy sanalar */}
      <Card>
        <FactList
          items={[
            {
              term: t("projects.details.dueDate"),
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--ink)]">
                    {s.plannedDeadline ? formatDate(s.plannedDeadline, locale) : t("projects.stageDeadline.notSet")}
                  </span>
                  {s.status === "active" && s.plannedDeadline && <DeadlineCountdown deadline={s.plannedDeadline} />}
                </span>
              ),
            },
            ...(s.plannedStartDate ? [{ term: t("projects.editStage.startDate"), value: formatDate(s.plannedStartDate, locale) }] : []),
            ...(s.contractNumber ? [{ term: t("projects.fields.contractNumber"), value: s.contractNumber }] : []),
          ]}
        />
      </Card>

      {/* Oʻzgartirish soʻraldi — nimani tuzatish, soʻngra qayta topshirish */}
      {changesRequested && s.reviewNote && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Status tone="danger">{t("review.changesRequestedTitle")}</Status>
            {s.reviewedAt && <span className="t-micro text-[var(--ink-3)]">{formatDate(s.reviewedAt, locale)}</span>}
          </div>
          <p className="mt-2 whitespace-pre-wrap t-body text-[var(--ink)]">{s.reviewNote}</p>
        </Card>
      )}

      {/* BKRM bu bosqichda nimani kutayotgani */}
      {s.requirements && (
        <Section title={t("review.requirements")}>
          <Card>
            <p className="whitespace-pre-wrap t-body text-[var(--ink-2)]">{s.requirements}</p>
          </Card>
        </Section>
      )}

      {/* Ishingizni topshirish — fayl qoʻshing, soʻngra koʻrib chiqishga uzating (tugma sarlavhada) */}
      <Section title={t("projects.stageDocs.title")}>
        <Card>
          {locked ? (
            <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] p-4 t-small text-[var(--ink-2)]">
              <Lock className="size-4 shrink-0" />
              {t("projects.stagePath.lockedHint")}
            </div>
          ) : (
            <div className="mb-4">
              <StudioStageUpload projectId={id} stageId={s.id} maxBytes={MAX_UPLOAD_BYTES} size="default" label={t("review.addFile")} variant="secondary" />
            </div>
          )}
          <StageDocuments stageId={s.id} documents={data.documents} canManage={false} suggestions={data.categorySuggestions} maxBytes={MAX_UPLOAD_BYTES} />
        </Card>
      </Section>

      {/* Bajarilish va soʻrovlar — bosqich sahifasidagi kanonik joy */}
      {(s.status === "active" || requests.length > 0) && (
        <Card>
          {s.status === "active" && (
            <>
              <StageProgressReporter stageId={s.id} latest={latestProgress} />
              <div className="mt-5">
                <h3 className="mb-3 text-[0.9375rem] font-bold text-[var(--ink)]">{t("studio.requests.title")}</h3>
                <StageRequestButtons stageId={s.id} currentDeadline={s.plannedDeadline ?? null} />
              </div>
            </>
          )}
          {requests.length > 0 && (
            <div className={s.status === "active" ? "mt-5" : ""}>
              {s.status !== "active" && <h3 className="mb-3 text-[0.9375rem] font-bold text-[var(--ink)]">{t("studio.requests.title")}</h3>}
              <StageRequestsList requests={requests} />
            </div>
          )}
        </Card>
      )}

      {/* Kurator bilan suhbat, faqat shu bosqich doirasida */}
      <Section title={t("projects.tabs.chat")}>
        <Card>
          <ProjectChat projectId={id} stageId={stageId} currentUserId={session.user.id} currentUserName={session.user.fullName} messages={messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))} />
        </Card>
      </Section>
    </div>
  );
}
