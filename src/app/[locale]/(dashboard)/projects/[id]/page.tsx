import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconCalendarClock as CalendarClock, IconMessageCircle as MessageCircle } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { auth } from "@/lib/auth";
import { getProject, listContractors } from "@/server/queries/projects";
import { getStageProject } from "@/server/queries/stages";
import { ProjectContractor } from "@/components/projects/project-contractor";
import { Card } from "@/components/ui-biib/Card";
import { Section } from "@/components/ui-biib/Section";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Button } from "@/components/ui-biib/Button";
import { FactList, type Fact } from "@/components/ui-biib/FactList";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { StagesList } from "@/components/projects/stages-list";
import { StagePath } from "@/components/projects/stage-path";
import { ProjectPoster } from "@/components/projects/project-poster";
import { ProjectDocsPanels } from "@/components/projects/project-docs-panels";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { DeliverablesList } from "@/components/projects/deliverables-list";

import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { isProjectGenre } from "@/lib/projects/genres";
import { canEditProjects, canViewMoney, canUploadProjectDocs, MONEY_MASK } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { formatDate } from "@/lib/dates";
import { CuratorList } from "@/components/ui/curator-list";
import { CurrentStatusEditor } from "@/components/studio/current-status-editor";
import { StageProgressBadge } from "@/components/studio/stage-progress";
import { StageRequestsList } from "@/components/studio/stage-requests";
import { getLatestStageProgress, getLatestStatusUpdates, listStageRequests } from "@/server/queries/studio";
import { isOwner } from "@/lib/permissions/owner";
import { DeadlineHistoryCard } from "@/components/staff/deadline-slippage/deadline-history-card";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// Summalar whitespace-nowrap konteynerlar içida körsatiladi, şunda "… UZS" heç qaçon alohida qatorga tuşmaydi.
const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

// Hisoblangan statusni BIIB toniga xaritalaymiz (manager donut bilan bir xil).
const statusToneOf = (s: DerivedStatus): StatusTone =>
  s === "completed" ? "success" : s === "in_progress" ? "info" : s === "on_hold" ? "warning" : "neutral";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;
  const data = await getProject(id);
  if (!data) notFound();
  const me = session.user;
  // Tahrirlaş oynasidagi kurator tanlagiçi uçun variantlar (barça faol içki xodimlar).
  const curatorOptions = await db
    .select({ id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(sql`${users.status}='active' AND ${users.position} <> 'kontragent' AND ${users.hidden} = false`)
    .orderBy(users.fullName);
  const editProject = {
    id: data.project.id,
    name: data.project.name,
    description: data.project.description,
    type: data.project.type,
    genre: data.project.genre,
    curatorUserId: data.project.curatorUserId,
    curatorUserIds: data.curators.map((c) => c.id),
    startDate: data.project.startDate,
    deadline: data.project.deadline,
    budget: data.project.budget,
    budgetCurrency: data.project.budgetCurrency,
    currentStatus: data.project.currentStatus,
  };
  // Tahrirlaş = qat'iy allowlist YOKI owner bergan huquq; aks holda faqat öqiş uçun.
  const editor = canEditProjects(me.email) || (await hasGrant(me.id, "projects.edit"));
  const canManage = editor;
  const canDelete = editor;
  // Butun loyihani öçiriş qaytarib bölmaydi → faqat editor + yuqori rahbariyat.
  const canDeleteProject = editor && ["direktor", "orinbosar", "koordinator"].includes(me.position);
  // Byudjet va tölov summalarini faqat "money" allowlistidagilar YOKI huquq berilgan foydalanuvçilar köradi.
  const showMoney = canViewMoney(me.email) || (await hasGrant(me.id, "money.view"));
  const canUpload = canUploadProjectDocs(me.email) || editor || (await hasGrant(me.id, "projects.upload_docs"));

  // ---- Turi belgilangan (şablon asosidagi) loyiha → ilonsimon bosqiç körinişi ----
  if (data.project.projectTypeId) {
    const sp = await getStageProject(id, locale);
    if (!sp) notFound();

    // Studiya bilan hamkorlik: joriy holat muallifi, faol bosqich progressi, so'rovlar.
    const activeStage = sp.stages.find((st) => st.status === "active") ?? null;
    const hasStudio = !!sp.project.externalCompanyId;
    const [statusUpdates, progressMap, studioRequests] = await Promise.all([
      getLatestStatusUpdates([id]),
      getLatestStageProgress(activeStage ? [activeStage.id] : []),
      hasStudio ? listStageRequests({ projectId: id }) : Promise.resolve([]),
    ]);
    const lastStatus = statusUpdates.get(id) ?? null;
    const activeProgress = activeStage ? progressMap.get(activeStage.id) ?? null : null;
    // So'rovni hal qilish: muharrir, egasi yoki shu loyiha kuratori (server ham tekshiradi).
    const canDecideRequests = canManage || isOwner(me.email) || sp.curators.some((c) => c.id === me.id);
    const contractors = await listContractors("approved");
    const canManageContractor = editor;
    const status = derivedStatus(sp.project.progressPercentage, sp.project.statusOverride);
    const currency = sp.project.budgetCurrency ?? "UZS";
    const remaining = Math.max(0, sp.totals.planned - sp.totals.paid);

    // Faktlar: Muddat, Kurator, Studiya, soʻngra Tur / Janr / Boshlanish / Byudjet / Bajarilish.
    const facts: Fact[] = [
      {
        term: t("projects.details.dueDate"),
        value: sp.project.deadline ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {formatDate(sp.project.deadline, locale)}
            {activeStage?.plannedDeadline && <DeadlineCountdown deadline={activeStage.plannedDeadline} />}
          </span>
        ) : (
          t("common.emptyValue")
        ),
      },
      {
        term: t("projects.curatorLabel"),
        value: sp.curators.length > 0 ? <CuratorList curators={sp.curators} locale={locale} /> : t("common.emptyValue"),
      },
      ...(hasStudio && sp.company
        ? [{
            term: t("projects.contractorLabel"),
            value: (
              <Link href={`/contractors/${sp.project.externalCompanyId}`} className="font-semibold text-[var(--tint)] hover:underline">
                {sp.company.name}
              </Link>
            ),
          } satisfies Fact]
        : []),
      ...(sp.type ? [{ term: t("projects.fields.type"), value: sp.type.name } satisfies Fact] : []),
      ...(isProjectGenre(sp.project.genre)
        ? [{ term: t("projects.fields.genre"), value: t(`projects.genre.${sp.project.genre}` as "projects.genre.film") } satisfies Fact]
        : []),
      { term: t("projects.details.startDate"), value: sp.project.startDate ? formatDate(sp.project.startDate, locale) : t("common.emptyValue") },
      {
        term: t("projects.details.budget"),
        value: <span className="tabular-nums">{sp.project.budget != null ? (showMoney ? money(Number(sp.project.budget), currency) : MONEY_MASK) : t("common.emptyValue")}</span>,
      },
      { term: t("projects.fields.progress"), value: <span className="font-bold tabular-nums">{sp.project.progressPercentage}%</span> },
    ];

    return (
      <div>
        <PageHeader
          back={<BackButton fallbackHref="/projects" />}
          title={
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {sp.project.name}
              <Status tone={statusToneOf(status)}>{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</Status>
            </span>
          }
          actions={
            <>
              {activeStage && (
                <Button asChild variant="primary" size="40" icon={CalendarClock}>
                  <Link href={`/projects/${id}/stages/${activeStage.id}`}>{t("projects.stagePath.currentStage")}</Link>
                </Button>
              )}
              {hasStudio && sp.project.externalCompanyId && (
                <Button asChild variant="glass" size="40" icon={MessageCircle}>
                  <Link href={`/contractors/${sp.project.externalCompanyId}/chat/${id}`}>{t("projects.tabs.chat")}</Link>
                </Button>
              )}
              {(canManage || canDeleteProject) && (
                <ProjectActionsMenu
                  project={editProject}
                  curators={curatorOptions}
                  canManage={canManage}
                  canDelete={canDeleteProject}
                  showInProgress={canManage && sp.project.statusOverride !== "on_hold" && (sp.project.progressPercentage === 0 || sp.project.statusOverride === "in_progress")}
                  onHold={sp.project.statusOverride === "on_hold"}
                  inProgress={sp.project.statusOverride === "in_progress"}
                />
              )}
            </>
          }
        />

        {/* Bitta tartibli ekran: ustki qism — 2 ustunli kompozitsiya, pastda — hujjatlar toʻliq kenglikda. */}
        <div className="flex min-w-0 flex-col gap-8 lg:gap-10">
          {/* Chap = faktlar + tavsif + joriy holat + bosqichlar; oʻng = poster + toʻlov + studiya + muddat tarixi. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
            {/* CHAP USTUN — mazmun va bosqichlar (telefonda birinchi) */}
            <div className="flex min-w-0 flex-col gap-6">
              <Card>
                <FactList items={facts} />
                {sp.project.description && (
                  <p className="mt-5 line-clamp-[8] whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink-2)]">
                    {sp.project.description}
                  </p>
                )}
              </Card>

              {(sp.project.currentStatus || canManage || hasStudio) && (
                <CurrentStatusEditor projectId={id} text={sp.project.currentStatus} lastUpdate={lastStatus} canEdit={canManage} />
              )}

              <Section title={t("projects.stagePath.title")}>
                <Card bare className="px-5 py-3 sm:px-6">
                  <StagePath projectId={sp.project.id} stages={sp.stages} />
                </Card>
              </Section>
            </div>

            {/* OʻNG USTUN — poster, toʻlov, studiya, muddat tarixi (telefonda bosqichlardan keyin) */}
            <div className="flex min-w-0 flex-col gap-6">
              <ProjectPoster projectId={sp.project.id} posterUrl={sp.project.posterUrl} name={sp.project.name} canManage={canManage} />

              <Card>
                <h3 className="mb-3 t-h4 text-[var(--ink)]">{t("projects.stagePayments.projectTotal")}</h3>
                <FactList
                  items={[
                    { term: t("projects.stagePayments.planned"), value: <span className="font-semibold tabular-nums">{showMoney ? money(sp.totals.planned, currency) : MONEY_MASK}</span> },
                    { term: t("projects.stagePayments.paid"), value: <span className="font-semibold tabular-nums text-[var(--success)]">{showMoney ? money(sp.totals.paid, currency) : MONEY_MASK}</span> },
                    { term: t("projects.stagePayments.remaining"), value: <span className="font-semibold tabular-nums text-[var(--warning)]">{showMoney ? money(remaining, currency) : MONEY_MASK}</span> },
                  ]}
                />
              </Card>

              {hasStudio && (
                <Card>
                  <ProjectContractor
                    projectId={sp.project.id}
                    company={sp.company}
                    contractors={contractors.map((c) => ({ id: c.id, name: c.name }))}
                    canManage={canManageContractor}
                  />
                </Card>
              )}

              {/* Studiya faolligi: faol bosqich progressi + soʻrovlar navbati */}
              {hasStudio && (activeStage || studioRequests.length > 0) && (
                <Card className="flex flex-col gap-4">
                  <h3 className="t-h4 text-[var(--ink)]">{t("conversation.studio")}</h3>
                  {activeStage && (
                    <div className="flex flex-col gap-2">
                      <Link href={`/projects/${id}/stages/${activeStage.id}`} className="min-w-0 break-words text-[0.9375rem] font-semibold text-[var(--ink)] hover:underline">
                        {activeStage.name}
                      </Link>
                      <StageProgressBadge data={activeProgress} />
                    </div>
                  )}
                  {studioRequests.length > 0 && (
                    <div className={activeStage ? "border-t border-[var(--line)] pt-4" : ""}>
                      <StageRequestsList requests={studioRequests} canDecide={canDecideRequests} showProject linkBase="/projects" />
                    </div>
                  )}
                </Card>
              )}

              {/* Bosqich muddatlari oʻzgarishlari tarixi (kim, qachon, nega) — oʻzining oyna kartasi bilan keladi */}
              <Suspense fallback={null}>
                <DeadlineHistoryCard projectId={id} locale={locale} />
              </Suspense>
            </div>
          </div>

          {/* Loyiha darajasidagi hujjatlar — toʻliq kenglikda, ikki panel uchun joy yetarli */}
          <Section title={t("projects.documents.title")}>
            <ProjectDocsPanels
              projectId={sp.project.id}
              canManage={canUpload}
              canDelete={editor}
              maxBytes={MAX_UPLOAD_BYTES}
              tahlil={sp.documents.tahlil.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))}
              xalqaro={sp.documents.xalqaro_tajriba.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))}
            />
          </Section>
        </div>
      </div>
    );
  }

  // ---- Eski (turi belgilanmagan) loyiha ----
  const stages = data.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    weight: m.weight,
    progress: m.progress,
    orderIndex: m.orderIndex,
    deadline: m.deadline,
  }));

  const status = derivedStatus(data.project.progressPercentage, data.project.statusOverride);
  const legacyFacts: Fact[] = [
    { term: t("projects.details.dueDate"), value: data.project.deadline ? formatDate(data.project.deadline, locale) : t("common.emptyValue") },
    { term: t("projects.fields.type"), value: t(`projects.type.${data.project.type}` as "projects.type.internal") },
    ...(isProjectGenre(data.project.genre)
      ? [{ term: t("projects.fields.genre"), value: t(`projects.genre.${data.project.genre}` as "projects.genre.film") } satisfies Fact]
      : []),
    ...(data.curators.length > 0
      ? [{ term: t("projects.curatorLabel"), value: <CuratorList curators={data.curators} locale={locale} /> } satisfies Fact]
      : []),
    ...(data.company
      ? [{
          term: t("projects.contractorLabel"),
          value: (
            <Link href={`/contractors/${data.company.id}`} className="font-semibold text-[var(--tint)] hover:underline">
              {data.company.name}
            </Link>
          ),
        } satisfies Fact]
      : []),
    { term: t("projects.details.startDate"), value: data.project.startDate ? formatDate(data.project.startDate, locale) : t("common.emptyValue") },
    {
      term: t("projects.details.budget"),
      value: <span className="tabular-nums">{data.project.budget != null ? (showMoney ? money(Number(data.project.budget), data.project.budgetCurrency) : MONEY_MASK) : t("common.emptyValue")}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={<BackButton fallbackHref="/projects" />}
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {data.project.name}
            <Status tone={statusToneOf(status)}>{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</Status>
          </span>
        }
        actions={
          (canManage || canDeleteProject) && (
            <ProjectActionsMenu
              project={editProject}
              curators={curatorOptions}
              canManage={canManage}
              canDelete={canDeleteProject}
              showInProgress={canManage && data.project.statusOverride !== "on_hold" && (data.project.progressPercentage === 0 || data.project.statusOverride === "in_progress")}
              onHold={data.project.statusOverride === "on_hold"}
              inProgress={data.project.statusOverride === "in_progress"}
            />
          )
        }
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        <Card>
          <FactList items={legacyFacts} />
          {data.project.description && (
            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink-2)]">{data.project.description}</p>
          )}
        </Card>

        {data.project.currentStatus && (
          <Card>
            <h3 className="mb-2 t-h3 text-[var(--ink)]">{t("projects.fields.currentStatus")}</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink-2)]">{data.project.currentStatus}</p>
          </Card>
        )}

        <Section title={t("projects.stagePath.title")}>
          <Card>
            <StagesList projectId={data.project.id} items={stages} canManage={canManage} canDelete={canDelete} />
          </Card>
        </Section>

        <Section title={t("projects.documents.title")}>
          <Card>
            <DeliverablesList
              projectId={data.project.id}
              items={data.deliverables.map((d) => ({ ...d, submittedAt: d.submittedAt as Date }))}
              milestones={stages.map((s) => ({ id: s.id, title: s.title }))}
              canSubmit={me.position === "kontragent" || canManage}
              canReview={canManage}
            />
          </Card>
        </Section>
      </div>
    </div>
  );
}
