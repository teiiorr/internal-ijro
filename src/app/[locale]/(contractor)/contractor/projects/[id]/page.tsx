import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { getProject } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MilestonesList } from "@/components/projects/milestones-list";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { ProjectChat } from "@/components/projects/project-chat";

export default async function ContractorProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { id } = await params;
  const data = await getProject(id);
  if (!data) notFound();

  const myCompany = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  if (myCompany.length === 0 || data.project.externalCompanyId !== myCompany[0].id) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{data.project.name}</h1>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <Badge variant={data.project.status === "completed" ? "success" : "default"}>{t(`status.${data.project.status}` as "status.planning")}</Badge>
          <span className="text-[var(--muted)]">{t("projects.headers.progress")}: {data.project.progressPercentage}%</span>
        </div>
      </div>

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
            <ProjectChat
              projectId={data.project.id}
              messages={data.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))}
            />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
