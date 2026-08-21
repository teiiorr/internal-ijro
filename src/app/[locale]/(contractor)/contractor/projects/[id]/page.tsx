import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconCalendarClock as CalendarClock } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, projectStages, stageDocuments } from "@/lib/db/schema";
import { getProject } from "@/server/queries/projects";
import { getStageProject } from "@/server/queries/stages";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StagePath } from "@/components/projects/stage-path";
import { ProjectPoster } from "@/components/projects/project-poster";
import { FitText } from "@/components/ui/fit-text";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { MilestonesList } from "@/components/projects/milestones-list";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { StudioDocuments } from "@/components/contractor/studio-documents";
import { ContractorChatTab } from "./contractor-chat-tab";
import { derivedStatus } from "@/lib/projects/progress";
import { isProjectGenre } from "@/lib/projects/genres";
import { formatDate } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { and, desc, eq } from "drizzle-orm";

const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

export default async function ContractorProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;

  const [myCompany] = await db
    .select({ id: externalCompanies.id })
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, session.user.email))
    .limit(1);
  if (!myCompany) notFound();

  const data = await getProject(id);
  if (!data || data.project.externalCompanyId !== myCompany.id) notFound();

  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 104857600);
  const typed = !!data.project.projectTypeId;

  if (typed) {
    const sp = await getStageProject(id, locale);
    if (!sp) notFound();

    const status = derivedStatus(sp.project.progressPercentage, sp.project.statusOverride);
    const statusTone: StatusTone =
      status === "completed" ? "green"
      : status === "in_progress" ? "amber"
      : status === "on_hold" ? "red"
      : "muted";
    const activeStage = sp.stages.find((s) => s.status === "active");
    const currency = sp.project.budgetCurrency ?? "UZS";

    const docs = await db
      .select({
        id: stageDocuments.id,
        fileUrl: stageDocuments.fileUrl,
        fileName: stageDocuments.fileName,
        fileSize: stageDocuments.fileSize,
        fileMimeType: stageDocuments.fileMimeType,
        category: stageDocuments.category,
        uploadedAt: stageDocuments.uploadedAt,
      })
      .from(stageDocuments)
      .innerJoin(projectStages, eq(projectStages.id, stageDocuments.stageId))
      .where(eq(projectStages.projectId, id))
      .orderBy(desc(stageDocuments.uploadedAt));
    const folderSuggestions = [...new Set(docs.map((d) => d.category).filter((c): c is string => !!c))];

    return (
      <div className="space-y-6 stagger-children">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/contractor/projects" className="mt-0.5" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug break-words">{sp.project.name}</h1>
          </div>
        </div>

        {sp.project.description && (
          <Card><CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">{sp.project.description}</CardContent></Card>
        )}

        <Card>
          <CardContent className="p-5 sm:p-6">
            <h3 className="text-base font-semibold mb-4">{t("projects.details.title")}</h3>
            <dl className="detail-grid grid grid-cols-2 min-[500px]:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("common.status")}</dt>
                <dd className="mt-0.5"><StatusTag tone={statusTone}>{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</StatusTag></dd>
              </div>
              {sp.type && (
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.type")}</dt>
                  <dd className="font-semibold mt-0.5 truncate">{sp.type.name}</dd>
                </div>
              )}
              {isProjectGenre(sp.project.genre) && (
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.genre")}</dt>
                  <dd className="mt-0.5"><StatusTag tone="muted">{t(`projects.genre.${sp.project.genre}` as "projects.genre.film")}</StatusTag></dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.progress")}</dt>
                <dd className="font-bold tabular-nums mt-0.5">{sp.project.progressPercentage}%</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.startDate")}</dt>
                <dd className="font-semibold mt-0.5">{sp.project.startDate ? formatDate(sp.project.startDate) : t("common.emptyValue")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.dueDate")}</dt>
                <dd className="font-semibold mt-0.5">{sp.project.deadline ? formatDate(sp.project.deadline) : t("common.emptyValue")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.budget")}</dt>
                <dd className="font-semibold mt-0.5 tabular-nums">{sp.project.budget != null ? money(Number(sp.project.budget), currency) : t("common.emptyValue")}</dd>
              </div>
            </dl>
            {sp.curator && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                <UserAvatar name={shortName(sp.curator.fullName)} avatarUrl={sp.curator.avatarUrl} size="sm" clickable={false} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--muted)]">{t("projects.curatorLabel")}</p>
                  <p className="font-semibold text-sm truncate">{shortName(sp.curator.fullName)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <div className="space-y-6 order-2 lg:order-1 min-w-0">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <h3 className="text-base font-semibold mb-4">{t("projects.stagePath.title")}</h3>
                <StagePath projectId={sp.project.id} stages={sp.stages} basePath="/contractor/projects" />
              </CardContent>
            </Card>

            <Tabs defaultValue="docs">
              <TabsList>
                <TabsTrigger value="docs">{t("contractor.tabs.docs")}</TabsTrigger>
                <TabsTrigger value="chat">{t("projects.tabs.chat")}</TabsTrigger>
              </TabsList>
              <TabsContent value="docs">
                <Card><CardContent className="p-5 sm:p-6">
                  <StudioDocuments projectId={id} documents={docs} suggestions={folderSuggestions} maxBytes={maxBytes} />
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="chat">
                <Card><CardContent className="p-5 sm:p-6">
                  <ContractorChatTab
                    projectId={data.project.id}
                    stages={sp.stages.map((s) => ({
                      id: s.id,
                      projectId: data.project.id,
                      name: s.name,
                      orderNumber: s.orderIndex + 1,
                      status: s.status,
                    }))}
                    currentUserId={session.user.id}
                  />
                </CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <ProjectPoster projectId={sp.project.id} posterUrl={sp.project.posterUrl} name={sp.project.name} canManage={false} />
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-base font-semibold">{t("projects.stagePayments.projectTotal")}</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-[var(--muted)]">{t("projects.stagePayments.planned")}</dt>
                    <dd className="min-w-0 flex-1 text-right font-semibold tabular-nums">
                      <FitText>{money(sp.totals.planned, currency)}</FitText>
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-[var(--muted)]">{t("projects.stagePayments.paid")}</dt>
                    <dd className="min-w-0 flex-1 text-right font-semibold tabular-nums text-[var(--success)]">
                      <FitText>{money(sp.totals.paid, currency)}</FitText>
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-[var(--muted)]">{t("projects.stagePayments.remaining")}</dt>
                    <dd className="min-w-0 flex-1 text-right font-semibold tabular-nums text-[var(--warning)]">
                      <FitText>{money(Math.max(0, sp.totals.planned - sp.totals.paid), currency)}</FitText>
                    </dd>
                  </div>
                </dl>
                {activeStage && (
                  <div className="space-y-2 border-t border-[var(--border)] pt-3">
                    <p className="text-sm text-[var(--muted)]">
                      {t("projects.stagePath.currentStage")}: <span className="font-medium text-[var(--foreground)]">{activeStage.name}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <CalendarClock className="size-3.5 shrink-0 text-[var(--muted)]" />
                      <span className={`font-medium ${activeStage.plannedDeadline ? "" : "text-[var(--muted)]"}`}>
                        {activeStage.plannedDeadline ? formatDate(activeStage.plannedDeadline) : t("projects.stageDeadline.notSet")}
                      </span>
                      {activeStage.plannedDeadline && <DeadlineCountdown deadline={activeStage.plannedDeadline} />}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Legacy (milestone) project
  const stages = data.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    weight: m.weight,
    progress: m.progress,
    orderIndex: m.orderIndex,
    deadline: m.deadline,
  }));

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/contractor/projects" className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug break-words">{data.project.name}</h1>
        </div>
      </div>

      {data.project.description && (
        <Card><CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">{data.project.description}</CardContent></Card>
      )}

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold">{t("projects.details.title")}</h3>
          <dl className="detail-grid grid grid-cols-2 min-[500px]:grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("common.status")}</dt>
              <dd className="mt-0.5"><Badge variant={data.project.status === "completed" ? "success" : "default"}>{t(`status.${data.project.status}` as "status.planning")}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.progress")}</dt>
              <dd className="font-bold tabular-nums mt-0.5">{data.project.progressPercentage}%</dd>
            </div>
            {data.project.startDate && (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.startDate")}</dt>
                <dd className="font-semibold mt-0.5">{formatDate(data.project.startDate)}</dd>
              </div>
            )}
            {data.project.deadline && (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.dueDate")}</dt>
                <dd className="font-semibold mt-0.5">{formatDate(data.project.deadline)}</dd>
              </div>
            )}
          </dl>
          {data.curator && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
              <UserAvatar name={data.curator.fullName} avatarUrl={data.curator.avatarUrl} size="sm" clickable={false} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--muted)]">{t("projects.curatorLabel")}</p>
                <p className="font-semibold text-sm truncate">{shortName(data.curator.fullName)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="milestones">
        <TabsList>
          <TabsTrigger value="milestones">{t("projects.tabs.milestones")}</TabsTrigger>
          <TabsTrigger value="deliverables">{t("projects.tabs.deliverables")}</TabsTrigger>
          <TabsTrigger value="chat">{t("projects.tabs.chat")}</TabsTrigger>
        </TabsList>
        <TabsContent value="milestones">
          <Card><CardContent className="p-6">
            <MilestonesList
              projectId={data.project.id}
              items={data.milestones.map((m) => ({ ...m, paymentAmount: m.paymentAmount as string | null }))}
              canManage={false}
              canChangePayment={false}
              showMoney={true}
            />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="deliverables">
          <Card><CardContent className="p-6">
            <DeliverablesList
              projectId={data.project.id}
              items={data.deliverables.map((d) => ({ ...d, submittedAt: d.submittedAt as Date }))}
              milestones={stages.map((s) => ({ id: s.id, title: s.title }))}
              canSubmit={true}
              canReview={false}
            />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="chat">
          <Card><CardContent className="p-6">
            <ProjectChat projectId={data.project.id} currentUserId={session.user.id} messages={data.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
