import { getTranslations, getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui-biib/Card";
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
    documentNumber?: string | null;
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
    <Card bare solid className="overflow-hidden">
      {/* Meta satri — holat, ustuvorlik, loyiha, muddat (kompakt) */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        {task.registrationNumber && <CopyRegistration regNum={task.registrationNumber} />}
        <TaskStatusBadge status={task.status} />
        <TaskPriorityBadge priority={task.priority} />
        {task.documentNumber && (
          <span className="t-small text-[var(--ink-2)]">
            <span className="text-[var(--ink-3)]">{t("tasks.fields.documentNumber")}:</span> {task.documentNumber}
          </span>
        )}
        {projectName && (
          <span className="t-small text-[var(--ink-2)]">
            <span className="text-[var(--ink-3)]">{t("common.project")}:</span> {projectName}
          </span>
        )}
        {task.deadline && (
          <span className={`ml-auto t-small font-semibold tabular-nums ${overdue ? "text-[var(--danger)]" : soon ? "text-[var(--warning)]" : "text-[var(--ink-2)]"}`}>
            {formattedDeadline}{relIsSameAsDate ? "" : `, ${rel.text}`}
          </span>
        )}
      </div>

      {/* Topshiriq beruvchi — ixcham qator */}
      <div className="flex items-center gap-2.5 border-t border-[var(--line)] px-4 py-2.5 sm:px-5">
        <UserAvatar name={shortName(creator?.fullName) || "—"} avatarUrl={creatorAvatar} size="sm" department={creatorDept} position={creatorPosition ? t(`positions.${creatorPosition}` as `positions.direktor`) : undefined} />
        <div className="min-w-0 flex-1">
          <p className="truncate t-small font-semibold text-[var(--ink)]">{shortName(creator?.fullName) || "—"}</p>
          {(creatorPosition || creatorDept) && (
            <p className="truncate t-micro text-[var(--ink-3)]">
              {creatorPosition ? t(`positions.${creatorPosition}` as `positions.direktor`) : ""}
              {creatorDept ? (creatorPosition ? `, ${creatorDept}` : creatorDept) : ""}
            </p>
          )}
        </div>
        <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{formatDate(task.createdAt, locale)}</span>
      </div>

      {task.description && (
        <div className="border-t border-[var(--line)] px-4 py-3.5 sm:px-5">
          <p className="whitespace-pre-wrap text-pretty text-[14px] leading-relaxed text-[var(--ink)]">{task.description}</p>
        </div>
      )}
    </Card>
  );
}
