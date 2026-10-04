import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users as usersTbl } from "@/lib/db/schema";
import { getTask, listAssignableUsers } from "@/server/queries/tasks";
import { getTaskDeadlineRequests } from "@/server/queries/task-history";
import { getNudgeStats } from "@/server/queries/task-control";
import { EditTaskButton } from "@/components/staff/task-edit/edit-task-button";
import { DeadlineRequestsCard } from "@/components/staff/task-edit/deadline-requests-card";
import { TaskHistoryCard } from "@/components/staff/task-edit/task-history-card";
import { CouncilResolutionBadge } from "@/components/staff/council-resolutions/council-resolution-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommentsSection } from "@/components/tasks/comments-section";
import { AttachmentsSection } from "@/components/tasks/attachments-section";
import { TaskHeaderCard } from "@/components/tasks/task-header-card";
import { AssigneesCard, type AssigneeItem } from "@/components/tasks/assignees-card";
import { MyResponseCard } from "@/components/tasks/my-response-card";
import { IconPrinter as Printer } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { ShareTaskChatButton } from "@/components/tasks/share-task-chat-button";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();

  const { id } = await params;
  const data = await getTask(id);
  if (!data) notFound();

  const me = session.user;
  const isCreator = data.task.createdByUserId === me.id;
  const myAssignment = data.assignees.find((a) => a.userId === me.id);
  const isAssignee = !!myAssignment;
  const canEdit = isCreator || isAssignee || ["direktor", "orinbosar"].includes(me.position);
  // Tahrirlash, muddat so'rovlarini hal qilish va eslatish — topshiriq beruvchi yoki rahbariyat.
  const canManage = isCreator || ["direktor", "orinbosar"].includes(me.position);
  const isParticipant = isCreator || isAssignee || ["direktor", "orinbosar"].includes(me.position);
  // Muddat UTC yarim tunda saqlanadi → Toshkent sanasi (YYYY-MM-DD).
  const deadlineDate = data.task.deadline
    ? new Date(new Date(data.task.deadline as Date).getTime() + 5 * 3600e3).toISOString().slice(0, 10)
    : null;
  const [requests, nudgeStats, people] = await Promise.all([
    getTaskDeadlineRequests(id),
    canManage ? getNudgeStats(id) : Promise.resolve({} as Record<string, { count: number; lastAt: string | null }>),
    canManage ? listAssignableUsers(me.id, me.position, me.departmentId) : Promise.resolve([]),
  ]);
  const myPending = requests.find((r) => r.requestedById === me.id && r.status === "pending");

  const assigneesForCard: AssigneeItem[] = data.assignees.map((a) => ({
    userId: a.userId,
    fullName: a.fullName,
    position: a.position,
    departmentName: a.departmentName,
    avatarUrl: a.avatarUrl,
    status: a.status as AssigneeItem["status"],
    responseText: a.responseText,
    responseFileUrl: a.responseFileUrl,
    responseFileName: a.responseFileName,
    responseSubmittedAt: a.responseSubmittedAt as Date | null,
    completedAt: a.completedAt as Date | null,
    updatedAt: a.updatedAt as Date,
  }));

  const allUsers = await db
    .select({ id: usersTbl.id, fullName: usersTbl.fullName, avatarUrl: usersTbl.avatarUrl })
    .from(usersTbl)
    .where(sql`${usersTbl.status} = 'active' AND ${usersTbl.hidden} = false`)
    .orderBy(usersTbl.fullName);

  return (
    <div className="space-y-5 max-w-5xl stagger-children">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <BackButton fallbackHref="/tasks" className="mt-0.5 shrink-0" />
          <h1 className="min-w-0 flex-1 text-base sm:text-lg font-semibold tracking-tight leading-snug break-words">
            {data.task.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0 sm:shrink-0 sm:justify-end">
          {canManage && (
            <EditTaskButton
              task={{ id: data.task.id, title: data.task.title, description: data.task.description, priority: data.task.priority, deadlineDate, status: data.task.status }}
              assignees={data.assignees.map((a) => ({ userId: a.userId, fullName: a.fullName, avatarUrl: a.avatarUrl, status: a.status, hasResponse: !!a.responseSubmittedAt }))}
              people={people}
            />
          )}
          {data.task.projectId && <ShareTaskChatButton taskId={data.task.id} />}
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={`/api/export/task/${data.task.id}`} target="_blank">
              <Printer className="size-4" /> {t("tasks.print")}
            </a>
          </Button>
        </div>
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
          registrationNumber: data.task.registrationNumber,
        }}
        projectName={data.project?.name ?? null}
      />

      <Suspense fallback={null}>
        <CouncilResolutionBadge taskId={id} />
      </Suspense>

      {isAssignee && myAssignment && (
        <MyResponseCard
          taskId={data.task.id}
          myStatus={myAssignment.status}
          responseText={myAssignment.responseText}
          responseFileUrl={myAssignment.responseFileUrl}
          responseFileName={myAssignment.responseFileName}
          responseSubmittedAt={myAssignment.responseSubmittedAt as Date | null}
          deadlineDate={deadlineDate}
          pendingDeadlineRequest={myPending ? { id: myPending.id, requestedDate: myPending.requestedDate, reason: myPending.reason } : null}
        />
      )}

      <AssigneesCard
        taskId={data.task.id}
        currentUserId={me.id}
        isCreator={isCreator}
        items={assigneesForCard}
        nudgeStats={nudgeStats}
        canNudge={canManage}
      />

      {requests.length > 0 && <DeadlineRequestsCard requests={requests} canDecide={canManage && data.task.status !== "completed"} locale={locale} />}

      {data.task.rejectionReason && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[var(--danger)] mb-1">{t("tasks.sections.rejectionReason")}</p>
            <p className="text-sm">{data.task.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {data.dependencies.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-base font-semibold">{t("tasks.sections.dependencies")}</h3>
            <ul className="space-y-1 text-sm">
              {data.dependencies.map((d) => (
                <li key={d.id}>
                  <Link href={`/tasks/${d.dependsOnTaskId}`} className="hover:underline font-medium">{d.dependsOnTitle}</Link>{" "}
                  <span className="text-[var(--muted)]">— {t(`status.${d.dependsOnStatus}` as "status.completed")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-base font-semibold">{t("tasks.sections.attachments")}</h3>
            <AttachmentsSection taskId={data.task.id} attachments={data.attachments} canEdit={canEdit} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-base font-semibold">{t("tasks.sections.comments")}</h3>
            <CommentsSection taskId={data.task.id} comments={data.comments} users={allUsers} />
          </CardContent>
        </Card>
      </div>

      {isParticipant && (
        <Suspense fallback={null}>
          <TaskHistoryCard taskId={id} taskCreatedAt={data.task.createdAt} locale={locale} />
        </Suspense>
      )}
    </div>
  );
}
