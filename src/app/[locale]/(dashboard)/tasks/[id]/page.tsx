import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { departments as deptsTbl, users as usersTbl } from "@/lib/db/schema";
import { getTask } from "@/server/queries/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusControl } from "@/components/tasks/status-control";
import { CommentsSection } from "@/components/tasks/comments-section";
import { ChecklistSection } from "@/components/tasks/checklist-section";
import { AttachmentsSection } from "@/components/tasks/attachments-section";
import { TaskHeaderCard } from "@/components/tasks/task-header-card";
import { AssigneesCard, type AssigneeItem } from "@/components/tasks/assignees-card";
import { ArrowLeft } from "lucide-react";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const { id } = await params;
  const data = await getTask(id);
  if (!data) notFound();

  const me = session.user;
  const isCreator = data.task.createdByUserId === me.id;
  const isAssignee = data.task.assignedToUserId === me.id;
  const canEdit = isCreator || isAssignee || ["direktor", "orinbosar"].includes(me.position);

  const ids = Array.from(new Set([data.task.assignedToUserId]));
  const peopleRows = await db
    .select({ id: usersTbl.id, fullName: usersTbl.fullName, deptName: deptsTbl.name })
    .from(usersTbl)
    .leftJoin(deptsTbl, eq(deptsTbl.id, usersTbl.departmentId))
    .where(inArray(usersTbl.id, ids));
  const peopleMap = new Map(peopleRows.map((p) => [p.id, p]));

  const assignees: AssigneeItem[] = [
    {
      id: data.task.assignedToUserId,
      fullName: peopleMap.get(data.task.assignedToUserId)?.fullName ?? "—",
      departmentName: peopleMap.get(data.task.assignedToUserId)?.deptName ?? null,
      status: data.task.status as AssigneeItem["status"],
      updatedAt: data.task.updatedAt,
      isPrimary: true,
    },
  ];

  const allUsers = await db
    .select({ id: usersTbl.id, fullName: usersTbl.fullName })
    .from(usersTbl)
    .where(sql`${usersTbl.status} = 'active'`)
    .orderBy(usersTbl.fullName);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="icon">
          <Link href="/tasks"><ArrowLeft className="size-5" /></Link>
        </Button>
        <h1 className="font-display text-2xl font-bold tracking-tight">{data.task.title}</h1>
      </div>

      <TaskHeaderCard
        creator={data.creator}
        task={{
          title: data.task.title,
          description: data.task.description,
          status: data.task.status,
          priority: data.task.priority,
          deadline: data.task.deadline as Date | null,
          createdAt: data.task.createdAt,
        }}
      />

      <AssigneesCard items={assignees} />

      {data.task.rejectionReason && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-[var(--danger)] font-medium mb-1">{t("tasks.sections.rejectionReason")}</p>
            <p className="text-base">{data.task.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-lg font-semibold">{t("tasks.sections.checklist")}</h3>
              <ChecklistSection taskId={data.task.id} items={data.checklist} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-lg font-semibold">{t("tasks.sections.attachments")}</h3>
              <AttachmentsSection taskId={data.task.id} attachments={data.attachments} canEdit={canEdit} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-lg font-semibold">{t("tasks.sections.comments")}</h3>
              <CommentsSection taskId={data.task.id} comments={data.comments} users={allUsers} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-lg font-semibold">{t("tasks.sections.statusSection")}</h3>
              <StatusControl taskId={data.task.id} current={data.task.status} isCreator={isCreator} />
            </CardContent>
          </Card>

          {data.dependencies.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold">{t("tasks.sections.dependencies")}</h3>
                <ul className="space-y-1 text-sm">
                  {data.dependencies.map((d) => (
                    <li key={d.id}>
                      <Link href={`/tasks/${d.dependsOnTaskId}`} className="hover:underline">{d.dependsOnTitle}</Link>{" "}
                      <span className="text-[var(--muted)]">— {t(`status.${d.dependsOnStatus}` as "status.completed")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.project && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <p className="text-[var(--muted)] text-sm">{t("common.project")}</p>
                <p className="font-medium">{data.project.name}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
