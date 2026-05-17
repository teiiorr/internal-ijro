import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getProject } from "@/server/queries/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MilestonesList } from "@/components/projects/milestones-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { CompleteProjectDialog } from "@/components/projects/complete-project-dialog";
import { GanttChart } from "@/components/projects/gantt-chart";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { id } = await params;
  const data = await getProject(id);
  if (!data) notFound();
  const me = session.user;
  const canManage = ["direktor", "orinbosar", "koordinator"].includes(me.position) || data.project.curatorUserId === me.id;
  const canCompletePaymentChange = ["direktor", "orinbosar"].includes(me.position);
  const canComplete = data.project.status !== "completed" && canManage;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{data.project.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm">
            <Badge variant="secondary">{data.project.type}</Badge>
            <Badge variant={data.project.status === "completed" ? "success" : "default"}>{data.project.status}</Badge>
            <span className="text-[var(--muted)]">{t("common.progress")}: {data.project.progressPercentage}%</span>
            {data.company && (
              <span className="text-[var(--muted)]">Contractor: <Link href="/contractors" className="hover:underline text-[var(--primary)]">{data.company.name}</Link></span>
            )}
            {data.curator && <span className="text-[var(--muted)]">Curator: {data.curator.fullName}</span>}
          </div>
        </div>
        {canComplete && (
          <CompleteProjectDialog projectId={data.project.id} externalCompanyId={data.project.externalCompanyId} />
        )}
      </div>

      {data.project.description && <p className="text-sm">{data.project.description}</p>}

      <Tabs defaultValue="milestones">
        <TabsList>
          <TabsTrigger value="milestones">{t("projects.tabs.milestones")}</TabsTrigger>
          <TabsTrigger value="gantt">{t("projects.tabs.gantt")}</TabsTrigger>
          <TabsTrigger value="deliverables">{t("projects.tabs.deliverables")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("projects.tabs.tasks")}</TabsTrigger>
          {data.company && <TabsTrigger value="chat">{t("projects.tabs.chat")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="gantt">
          <Card><CardContent className="p-6">
            <GanttChart
              projectStart={data.project.startDate}
              projectDeadline={data.project.deadline}
              milestones={data.milestones.map((m) => ({ id: m.id, title: m.title, status: m.status, deadline: m.deadline, weight: m.weight }))}
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card><CardContent className="p-6">
            <MilestonesList
              projectId={data.project.id}
              items={data.milestones.map((m) => ({ ...m, paymentAmount: m.paymentAmount as string | null }))}
              canManage={canManage}
              canChangePayment={canCompletePaymentChange}
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="deliverables">
          <Card><CardContent className="p-6">
            <DeliverablesList
              projectId={data.project.id}
              items={data.deliverables.map((d) => ({ ...d, submittedAt: d.submittedAt as Date }))}
              milestones={data.milestones.map((m) => ({ id: m.id, title: m.title }))}
              canSubmit={me.position === "kontragent" || canManage}
              canReview={canManage}
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card><CardContent className="p-6">
            {data.tasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t("projects.noLinkedTasks")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tasks/${t.id}`} className="hover:underline">{t.title}</Link>{" "}
                    <span className="text-[var(--muted)]">— {t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        {data.company && (
          <TabsContent value="chat">
            <Card><CardContent className="p-6">
              <ProjectChat
                projectId={data.project.id}
                messages={data.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))}
              />
            </CardContent></Card>
          </TabsContent>
        )}
      </Tabs>

      {data.ratings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("projects.ratings")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.ratings.map((r) => (
              <div key={r.id} className="text-sm">
                ⭐ {r.score}/5 {r.notes && <span className="text-[var(--muted)]">— {r.notes}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
