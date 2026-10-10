import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, projectStages, stageDocuments } from "@/lib/db/schema";
import { getProject } from "@/server/queries/projects";
import { getStageProject } from "@/server/queries/stages";
import { Card } from "@/components/ui-biib/Card";
import { Section } from "@/components/ui-biib/Section";
import { Heading } from "@/components/ui-biib/Heading";
import { FactList } from "@/components/ui-biib/FactList";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui-biib/Button";
import { StagePath } from "@/components/projects/stage-path";
import { SmoothImage } from "@/components/ui/smooth-image";
import { MilestonesList } from "@/components/projects/milestones-list";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { StudioDocuments } from "@/components/contractor/studio-documents";
import { derivedStatus } from "@/lib/projects/progress";
import { formatDate } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrentStatusEditor } from "@/components/studio/current-status-editor";
import { StageRequestsList } from "@/components/studio/stage-requests";
import { getLatestStatusUpdates, listStageRequests } from "@/server/queries/studio";
import { desc, eq } from "drizzle-orm";

const STATUS_TONE: Record<string, StatusTone> = {
  completed: "success",
  in_progress: "warning",
  on_hold: "warning",
  not_started: "neutral",
};

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
    const statusTone = STATUS_TONE[status] ?? "neutral";

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

    // Studiya boshqaruvi: joriy holat va soʻrovlar. Bajarilish foizi va soʻrov tugmalari
    // bosqich sahifasida (oʻzining kanonik joyida).
    const activeStage = sp.stages.find((s) => s.status === "active") ?? null;
    const [statusUpdates, requests] = await Promise.all([
      getLatestStatusUpdates([id]),
      listStageRequests({ projectId: id }),
    ]);
    const lastStatus = statusUpdates.get(id) ?? null;

    return (
      <div className="flex flex-col gap-8 lg:gap-12">
        {/* Sarlavha — orqaga + poster + nom, oʻngda asosiy amal */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <BackButton fallbackHref="/contractor/projects" className="mt-0.5 shrink-0" />
            {sp.project.posterUrl && (
              <div className="relative size-11 shrink-0 overflow-hidden rounded-[var(--radius-s)] bg-[var(--surface-2)] sm:size-12">
                <SmoothImage src={sp.project.posterUrl} alt={sp.project.name} className="size-full object-cover object-[center_25%]" />
              </div>
            )}
            <Heading level={1} trim className="min-w-0 flex-1 break-words">{sp.project.name}</Heading>
          </div>
          {activeStage && (
            <Button asChild variant="primary" size="40" icon={IconArrowRight} iconPosition="end" className="max-sm:w-full">
              <Link href={`/contractor/projects/${id}/stages/${activeStage.id}`}>{t("contractor.openStage")}</Link>
            </Button>
          )}
        </header>

        {/* Ixcham maʼlumot: holat, bajarilish, sanalar, kurator, tavsif */}
        <Card>
          <FactList
            items={[
              { term: t("common.status"), value: <Status tone={statusTone}>{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</Status> },
              { term: t("projects.fields.progress"), value: <span className="font-bold tabular-nums text-[var(--ink)]">{sp.project.progressPercentage}%</span> },
              { term: t("projects.details.startDate"), value: sp.project.startDate ? formatDate(sp.project.startDate, locale) : t("common.emptyValue") },
              { term: t("projects.details.dueDate"), value: sp.project.deadline ? formatDate(sp.project.deadline, locale) : t("common.emptyValue") },
              ...(sp.curator
                ? [{
                    term: t("projects.curatorLabel"),
                    value: (
                      <span className="flex items-center gap-2">
                        <UserAvatar name={shortName(sp.curator.fullName)} avatarUrl={sp.curator.avatarUrl} size="xs" clickable={false} />
                        <span className="truncate font-medium text-[var(--ink)]">{shortName(sp.curator.fullName)}</span>
                      </span>
                    ),
                  }]
                : []),
            ]}
          />
          {sp.project.description && (
            <p className="mt-5 whitespace-pre-wrap t-body text-[var(--ink-2)]">{sp.project.description}</p>
          )}
        </Card>

        {/* Joriy holat — studiya yozadi, xodimlar panelida darhol koʻrinadi */}
        <CurrentStatusEditor projectId={id} text={sp.project.currentStatus} lastUpdate={lastStatus} canEdit />

        {/* Soʻrovlar — bitta roʻyxat */}
        {requests.length > 0 && (
          <Section title={t("studio.requests.title")}>
            <Card bare className="px-5 sm:px-6">
              <StageRequestsList requests={requests} showProject linkBase="/contractor/projects" />
            </Card>
          </Section>
        )}

        {/* Qayerdaman — bosqichlar koʻrsatkichi */}
        <Section title={t("projects.stagePath.title")}>
          <Card>
            <StagePath projectId={sp.project.id} stages={sp.stages} basePath="/contractor/projects" />
          </Card>
        </Section>

        {/* Topshirilgan barcha fayllar */}
        <Section title={t("projects.stageDocs.title")}>
          <Card>
            <StudioDocuments projectId={id} documents={docs} suggestions={folderSuggestions} maxBytes={maxBytes} />
          </Card>
        </Section>

        {/* Suhbat — toʻliq ekranli chatga oʻtish */}
        <Card bare className="px-5 sm:px-6">
          <Rows>
            <Row href={`/contractor/chats/${id}`}>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium text-[var(--ink)]">{t("projects.tabs.chat")}</span>
              <IconArrowRight className="size-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
            </Row>
          </Rows>
        </Card>
      </div>
    );
  }

  // Eski (milestone) usuldagi loyiha — ichki moliya koʻrsatilmaydi.
  const stages = data.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    weight: m.weight,
    progress: m.progress,
    orderIndex: m.orderIndex,
    deadline: m.deadline,
  }));

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <header className="flex items-start gap-2">
        <BackButton fallbackHref="/contractor/projects" className="mt-0.5 shrink-0" />
        <Heading level={1} trim className="min-w-0 flex-1 break-words">{data.project.name}</Heading>
      </header>

      <Card>
        <FactList
          items={[
            { term: t("common.status"), value: <Status tone={data.project.status === "completed" ? "success" : "info"}>{t(`status.${data.project.status}` as "status.planning")}</Status> },
            { term: t("projects.fields.progress"), value: <span className="font-bold tabular-nums text-[var(--ink)]">{data.project.progressPercentage}%</span> },
            ...(data.project.startDate ? [{ term: t("projects.details.startDate"), value: formatDate(data.project.startDate, locale) }] : []),
            ...(data.project.deadline ? [{ term: t("projects.details.dueDate"), value: formatDate(data.project.deadline, locale) }] : []),
            ...(data.curator
              ? [{
                  term: t("projects.curatorLabel"),
                  value: (
                    <span className="flex items-center gap-2">
                      <UserAvatar name={data.curator.fullName} avatarUrl={data.curator.avatarUrl} size="xs" clickable={false} />
                      <span className="truncate font-medium text-[var(--ink)]">{shortName(data.curator.fullName)}</span>
                    </span>
                  ),
                }]
              : []),
          ]}
        />
        {data.project.description && (
          <p className="mt-5 whitespace-pre-wrap t-body text-[var(--ink-2)]">{data.project.description}</p>
        )}
      </Card>

      <Tabs defaultValue="deliverables">
        <TabsList>
          <TabsTrigger value="deliverables">{t("projects.tabs.deliverables")}</TabsTrigger>
          <TabsTrigger value="milestones">{t("projects.tabs.milestones")}</TabsTrigger>
          <TabsTrigger value="chat">{t("projects.tabs.chat")}</TabsTrigger>
        </TabsList>
        <TabsContent value="deliverables">
          <Card solid>
            <DeliverablesList
              projectId={data.project.id}
              items={data.deliverables.map((d) => ({ ...d, submittedAt: d.submittedAt as Date }))}
              milestones={stages.map((s) => ({ id: s.id, title: s.title }))}
              canSubmit={true}
              canReview={false}
            />
          </Card>
        </TabsContent>
        <TabsContent value="milestones">
          <Card solid>
            <MilestonesList
              projectId={data.project.id}
              items={data.milestones.map((m) => ({ ...m, paymentAmount: m.paymentAmount as string | null }))}
              canManage={false}
              canChangePayment={false}
              showMoney={false}
            />
          </Card>
        </TabsContent>
        <TabsContent value="chat">
          <Card solid>
            <ProjectChat projectId={data.project.id} currentUserId={session.user.id} currentUserName={session.user.fullName} messages={data.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
