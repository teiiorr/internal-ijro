import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, projectStages, stageDocuments } from "@/lib/db/schema";
import { getProject } from "@/server/queries/projects";
import { getStageProject } from "@/server/queries/stages";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MilestonesList } from "@/components/projects/milestones-list";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { StudioDocuments } from "@/components/contractor/studio-documents";
import { formatDate } from "@/lib/dates";

const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

export default async function ContractorProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;

  // Ownership: the project must belong to the studio resolved from the caller's email.
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
  const sp = typed ? await getStageProject(id, locale) : null;

  // The studio's project documents (across all its stages) for the media/docs area.
  const docs = typed
    ? await db
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
        .orderBy(desc(stageDocuments.uploadedAt))
    : [];
  const folderSuggestions = [...new Set(docs.map((d) => d.category).filter((c): c is string => !!c))];

  const currency = sp?.project.budgetCurrency ?? data.project.budgetCurrency ?? "UZS";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{data.project.name}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
          <Badge variant={data.project.status === "completed" ? "success" : "default"}>
            {t(`status.${data.project.status}` as "status.planning")}
          </Badge>
          <span className="text-[var(--muted)]">{t("projects.headers.progress")}: {data.project.progressPercentage}%</span>
        </div>
      </div>

      {/* Budget / payment sums — the studio sees the money for its OWN project. */}
      {sp && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-base font-semibold mb-3">{t("contractor.budget.title")}</h3>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("projects.stagePayments.planned")}</dt>
                <dd className="font-bold tabular-nums mt-0.5">{money(sp.totals.planned, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("projects.stagePayments.paid")}</dt>
                <dd className="font-bold tabular-nums mt-0.5 text-[var(--success)]">{money(sp.totals.paid, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("projects.stagePayments.pending")}</dt>
                <dd className="font-bold tabular-nums mt-0.5 text-[var(--warning)]">{money(sp.totals.pending, currency)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {typed && sp ? (
        <Tabs defaultValue="docs">
          <TabsList>
            <TabsTrigger value="docs">{t("contractor.tabs.docs")}</TabsTrigger>
            <TabsTrigger value="stages">{t("contractor.tabs.stages")}</TabsTrigger>
            <TabsTrigger value="chat">{t("projects.tabs.chat")}</TabsTrigger>
          </TabsList>

          <TabsContent value="docs">
            <Card><CardContent className="p-5 sm:p-6">
              <StudioDocuments projectId={id} documents={docs} suggestions={folderSuggestions} maxBytes={maxBytes} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="stages">
            <Card><CardContent className="p-5 sm:p-6">
              <ul className="space-y-2">
                {sp.stages.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5">
                    <span className={"grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold " +
                      (s.status === "completed" ? "bg-[var(--success)]/15 text-[var(--success)]"
                        : s.status === "active" ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                        : "bg-[var(--surface-3)] text-[var(--muted)]")}>
                      {s.orderIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {s.plannedStartDate ? formatDate(s.plannedStartDate) : "—"}
                        {" → "}
                        {s.plannedDeadline ? formatDate(s.plannedDeadline) : "—"}
                        {s.plannedAmount != null ? ` · ${money(s.plannedAmount, currency)}` : ""}
                      </p>
                    </div>
                    <Badge variant={s.status === "completed" ? "success" : s.status === "active" ? "warning" : "secondary"}>
                      {t(`projects.stagePath.${s.status === "completed" ? "done" : s.status}` as "projects.stagePath.active")}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card><CardContent className="p-5 sm:p-6">
              <ProjectChat projectId={data.project.id} currentUserId={session.user.id} messages={data.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))} />
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Legacy (milestone) project — keep the original view.
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
                milestones={data.milestones.map((m) => ({ id: m.id, title: m.title }))}
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
      )}
    </div>
  );
}
