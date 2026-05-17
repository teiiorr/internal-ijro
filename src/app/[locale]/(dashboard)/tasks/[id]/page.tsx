import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getTask } from "@/server/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { StatusControl } from "@/components/tasks/status-control";
import { CommentsSection } from "@/components/tasks/comments-section";
import { ChecklistSection } from "@/components/tasks/checklist-section";
import { WatcherToggle } from "@/components/tasks/watcher-toggle";
import { AttachmentsSection } from "@/components/tasks/attachments-section";
import { sql } from "drizzle-orm";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const data = await getTask(id);
  if (!data) notFound();

  const me = session.user;
  const isCreator = data.task.createdByUserId === me.id;
  const isAssignee = data.task.assignedToUserId === me.id;
  const isWatcher = data.watchers.some((w) => w.userId === me.id);
  const canEdit = isCreator || isAssignee || ["direktor", "orinbosar"].includes(me.position);

  const allUsers = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(sql`${users.status} = 'active'`)
    .orderBy(users.fullName);

  const overdue =
    data.task.deadline && new Date(data.task.deadline) < new Date() && !["completed", "rejected"].includes(data.task.status);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{data.task.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <TaskStatusBadge status={data.task.status} />
            <TaskPriorityBadge priority={data.task.priority} />
            {data.task.deadline && (
              <Badge variant={overdue ? "danger" : "secondary"}>
                Due {new Date(data.task.deadline).toLocaleString()}
              </Badge>
            )}
            {data.project && (
              <Link href={`/projects/${data.project.id}`} className="text-sm text-[var(--primary)] hover:underline">
                {data.project.name}
              </Link>
            )}
          </div>
        </div>
        <WatcherToggle taskId={data.task.id} watching={isWatcher} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{data.task.description ?? <span className="text-[var(--muted)]">No description.</span>}</p>
              {data.task.rejectionReason && (
                <div className="mt-4 rounded-lg bg-[var(--danger)]/10 p-3 text-sm">
                  <p className="font-medium">Rejection reason</p>
                  <p>{data.task.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Checklist</CardTitle></CardHeader>
            <CardContent>
              <ChecklistSection taskId={data.task.id} items={data.checklist} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Attachments</CardTitle></CardHeader>
            <CardContent>
              <AttachmentsSection taskId={data.task.id} attachments={data.attachments} canEdit={canEdit} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Comments</CardTitle></CardHeader>
            <CardContent>
              <CommentsSection taskId={data.task.id} comments={data.comments.map((c) => ({ ...c, mentions: (c.mentions as string[] | null) ?? null }))} users={allUsers} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Status</CardTitle></CardHeader>
            <CardContent>
              <StatusControl taskId={data.task.id} current={data.task.status} isCreator={isCreator} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">People</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div><span className="text-[var(--muted)]">Assignee:</span> {data.assignee?.fullName ?? "—"}</div>
              <div><span className="text-[var(--muted)]">Creator:</span> {data.creator?.fullName ?? "—"}</div>
              <div className="pt-2">
                <span className="text-[var(--muted)]">Watchers ({data.watchers.length}):</span>
                <ul className="mt-1 text-sm">
                  {data.watchers.map((w) => <li key={w.userId}>{w.fullName}</li>)}
                </ul>
              </div>
            </CardContent>
          </Card>

          {data.dependencies.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Dependencies</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.dependencies.map((d) => (
                    <li key={d.id}>
                      <Link href={`/tasks/${d.dependsOnTaskId}`} className="hover:underline">{d.dependsOnTitle}</Link>{" "}
                      <span className="text-[var(--muted)]">— {d.dependsOnStatus}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
