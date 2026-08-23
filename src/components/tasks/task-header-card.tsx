import { getTranslations, getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/tasks/task-status-badge";
import { CopyRegistration } from "@/components/copy-registration";
import { deadlineRelative, formatDate } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { db } from "@/lib/db";
import { departments as deptsTbl, users as usersTbl } from "@/lib/db/schema";
import { UserAvatar } from "@/components/ui/user-avatar";

type Props = {
  creator: { id: string; fullName: string; position?: string | null } | null;
  task: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
    deadline: Date | null;
    createdAt: Date;
    registrationNumber: string | null;
  };
  projectName?: string | null;
};


export async function TaskHeaderCard({ creator, task, projectName }: Props) {
  const t = await getTranslations();
  const locale = await getLocale();
  let creatorPosition: string | null = null;
  let creatorDept: string | null = null;
  let creatorAvatar: string | null = null;
  if (creator?.id) {
    const row = await db
      .select({ position: usersTbl.position, deptName: deptsTbl.name, avatarUrl: usersTbl.avatarUrl })
      .from(usersTbl)
      .leftJoin(deptsTbl, eq(deptsTbl.id, usersTbl.departmentId))
      .where(eq(usersTbl.id, creator.id))
      .limit(1);
    creatorPosition = row[0]?.position ?? null;
    creatorDept = row[0]?.deptName ?? null;
    creatorAvatar = row[0]?.avatarUrl ?? null;
  }

  const isCompleted = ["completed", "rejected"].includes(task.status);
  const rel = deadlineRelative(task.deadline, { completed: isCompleted }, locale);
  const overdue = rel.tone === "overdue";
  const soon = rel.tone === "soon" || rel.tone === "today";
  const formattedDeadline = task.deadline ? formatDate(task.deadline, locale) : "";
  const relIsSameAsDate = rel.text === formattedDeadline;

  return (
    <Card className="overflow-hidden">
      <div className="px-5 sm:px-6 py-4 flex items-center gap-3 flex-wrap">
        {task.registrationNumber && <CopyRegistration regNum={task.registrationNumber} />}
        <TaskStatusBadge status={task.status} />
        <TaskPriorityBadge priority={task.priority} />
        {projectName && (
          <span className="text-xs font-medium text-[var(--muted)]">
            <span className="text-[var(--subtle)]">{t("common.project")}:</span> {projectName}
          </span>
        )}
        {task.deadline && (
          <span className={`ml-auto text-xs font-semibold ${overdue ? "text-[var(--danger)]" : soon ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>
            {formattedDeadline}{relIsSameAsDate ? "" : ` · ${rel.text}`}
          </span>
        )}
      </div>

      <div className="border-t border-[var(--border)] px-5 sm:px-6 py-4 flex items-center gap-3">
        <UserAvatar name={shortName(creator?.fullName) || "—"} avatarUrl={creatorAvatar} size="md" department={creatorDept} position={creatorPosition ? t(`positions.${creatorPosition}` as `positions.direktor`) : undefined} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold truncate">{shortName(creator?.fullName) || "—"}</p>
          <p className="text-xs text-[var(--muted)] truncate">
            {creatorPosition ? t(`positions.${creatorPosition}` as `positions.direktor`) : ""}
            {creatorDept ? <span> · {creatorDept}</span> : null}
          </p>
        </div>
        <span className="text-xs text-[var(--muted)] tabular shrink-0">{formatDate(task.createdAt, locale)}</span>
      </div>

      {task.description && (
        <div className="border-t border-[var(--border)] px-5 sm:px-6 py-4">
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-pretty">{task.description}</p>
        </div>
      )}
    </Card>
  );
}
