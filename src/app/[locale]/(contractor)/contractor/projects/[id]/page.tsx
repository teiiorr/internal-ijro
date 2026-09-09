import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, projectStages, stageDocuments } from "@/lib/db/schema";
import { getProject } from "@/server/queries/projects";
import { getStageProject } from "@/server/queries/stages";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StagePath } from "@/components/projects/stage-path";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { MilestonesList } from "@/components/projects/milestones-list";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { StudioDocuments } from "@/components/contractor/studio-documents";
import { derivedStatus } from "@/lib/projects/progress";
import { formatDate } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { desc, eq } from "drizzle-orm";

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
      <div className="space-y-5 stagger-children">
        {/* Sarlavha — orqaga + poster miniatyurasi + nom */}
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/contractor/projects" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {sp.project.posterUrl && (
              <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-2)] sm:size-12">
                <SmoothImage src={sp.project.posterUrl} alt={sp.project.name} className="size-full object-cover object-[center_25%]" />
              </div>
            )}
            <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug tracking-tight break-words sm:text-2xl">{sp.project.name}</h1>
          </div>
        </div>

        {/* Ixcham ma'lumot — eng ustda: holat, bajarilish, sanalar, kurator, tavsif */}
        <Card>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <dl className="detail-grid grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("common.status")}</dt>
                <dd className="mt-0.5"><StatusTag tone={statusTone}>{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</StatusTag></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.progress")}</dt>
                <dd className="mt-0.5 font-bold tabular-nums">{sp.project.progressPercentage}%</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.startDate")}</dt>
                <dd className="mt-0.5 font-semibold">{sp.project.startDate ? formatDate(sp.project.startDate, locale) : t("common.emptyValue")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.dueDate")}</dt>
                <dd className="mt-0.5 font-semibold">{sp.project.deadline ? formatDate(sp.project.deadline, locale) : t("common.emptyValue")}</dd>
              </div>
            </dl>
            {sp.curator && (
              <div className="flex items-center gap-2 border-t border-[var(--border)] pt-4">
                <UserAvatar name={shortName(sp.curator.fullName)} avatarUrl={sp.curator.avatarUrl} size="sm" clickable={false} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--muted)]">{t("projects.curatorLabel")}</p>
                  <p className="truncate text-sm font-semibold">{shortName(sp.curator.fullName)}</p>
                </div>
              </div>
            )}
            {sp.project.description && (
              <p className="whitespace-pre-wrap border-t border-[var(--border)] pt-4 text-sm leading-relaxed text-[var(--muted)]">{sp.project.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Qayerdaman — bosqichlar körsatkichi */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h3 className="mb-4 text-base font-semibold">{t("projects.stagePath.title")}</h3>
            <StagePath projectId={sp.project.id} stages={sp.stages} basePath="/contractor/projects" />
          </CardContent>
        </Card>

        {/* Topşirilgan barcha fayllar */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h3 className="mb-4 text-base font-semibold">{t("contractor.tabs.docs")}</h3>
            <StudioDocuments projectId={id} documents={docs} suggestions={folderSuggestions} maxBytes={maxBytes} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Eski (milestone) usuldagi loyiha — aynan şu soddalaştiriş: ichki moliya körsatilmaydi.
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
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/contractor/projects" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-snug tracking-tight break-words sm:text-2xl">{data.project.name}</h1>
        </div>
      </div>

      {data.project.description && (
        <Card><CardContent className="whitespace-pre-wrap p-5 text-sm leading-relaxed">{data.project.description}</CardContent></Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h3 className="text-base font-semibold">{t("projects.details.title")}</h3>
          <dl className="detail-grid grid grid-cols-2 gap-2 text-sm min-[500px]:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("common.status")}</dt>
              <dd className="mt-0.5"><Badge variant={data.project.status === "completed" ? "success" : "default"}>{t(`status.${data.project.status}` as "status.planning")}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.fields.progress")}</dt>
              <dd className="mt-0.5 font-bold tabular-nums">{data.project.progressPercentage}%</dd>
            </div>
            {data.project.startDate && (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.startDate")}</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(data.project.startDate, locale)}</dd>
              </div>
            )}
            {data.project.deadline && (
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.dueDate")}</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(data.project.deadline, locale)}</dd>
              </div>
            )}
          </dl>
          {data.curator && (
            <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
              <UserAvatar name={data.curator.fullName} avatarUrl={data.curator.avatarUrl} size="sm" clickable={false} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--muted)]">{t("projects.curatorLabel")}</p>
                <p className="truncate text-sm font-semibold">{shortName(data.curator.fullName)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="deliverables">
        <TabsList>
          <TabsTrigger value="deliverables">{t("projects.tabs.deliverables")}</TabsTrigger>
          <TabsTrigger value="milestones">{t("projects.tabs.milestones")}</TabsTrigger>
          <TabsTrigger value="chat">{t("projects.tabs.chat")}</TabsTrigger>
        </TabsList>
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
        <TabsContent value="milestones">
          <Card><CardContent className="p-6">
            <MilestonesList
              projectId={data.project.id}
              items={data.milestones.map((m) => ({ ...m, paymentAmount: m.paymentAmount as string | null }))}
              canManage={false}
              canChangePayment={false}
              showMoney={false}
            />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="chat">
          <Card><CardContent className="p-6">
            <ProjectChat projectId={data.project.id} currentUserId={session.user.id} currentUserName={session.user.fullName} messages={data.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
