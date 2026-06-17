import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyRegistration } from "@/components/copy-registration";
import { deadlineRelative, formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { departments as deptsTbl, users as usersTbl } from "@/lib/db/schema";

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

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-10 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-semibold text-sm shrink-0">
      {initials}
    </div>
  );
}

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "warning" | "danger"> = {
  urgent: "danger",
  high: "warning",
  medium: "default",
  low: "secondary",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "success" | "danger"> = {
  todo: "secondary",
  in_progress: "default",
  under_review: "warning",
  completed: "success",
  rejected: "danger",
};

export async function TaskHeaderCard({ creator, task, projectName }: Props) {
  const t = await getTranslations();
  let creatorPosition: string | null = null;
  let creatorDept: string | null = null;
  if (creator?.id) {
    const row = await db
      .select({ position: usersTbl.position, deptName: deptsTbl.name })
      .from(usersTbl)
      .leftJoin(deptsTbl, eq(deptsTbl.id, usersTbl.departmentId))
      .where(eq(usersTbl.id, creator.id))
      .limit(1);
    creatorPosition = row[0]?.position ?? null;
    creatorDept = row[0]?.deptName ?? null;
  }

  const isCompleted = ["completed", "rejected"].includes(task.status);
  const rel = deadlineRelative(task.deadline, { completed: isCompleted });
  const overdue = rel.tone === "overdue";
  const soon = rel.tone === "soon" || rel.tone === "today";

  return (
    <Card className="overflow-hidden">
      <div className="px-5 sm:px-6 py-4 flex items-center gap-3 flex-wrap">
        {task.registrationNumber && <CopyRegistration regNum={task.registrationNumber} />}
        <Badge variant={STATUS_VARIANT[task.status] ?? "secondary"}>
          {t(`tasks.status.${task.status}` as "tasks.status.todo")}
        </Badge>
        <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"}>
          {t(`tasks.priority.${task.priority}` as "tasks.priority.low")}
        </Badge>
        {projectName && (
          <span className="text-xs font-medium text-[var(--muted)]">
            <span className="text-[var(--subtle)]">{t("common.project")}:</span> {projectName}
          </span>
        )}
        {task.deadline && (
          <span className={`ml-auto text-xs font-semibold ${overdue ? "text-[var(--danger)]" : soon ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>
            {formatDate(task.deadline)} · {rel.text}
          </span>
        )}
      </div>

      <div className="border-t border-[var(--border)] px-5 sm:px-6 py-4 flex items-center gap-3">
        <Initials name={creator?.fullName ?? "—"} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold truncate">{creator?.fullName ?? "—"}</p>
          <p className="text-xs text-[var(--muted)] truncate">
            {creatorPosition ? t(`positions.${creatorPosition}` as `positions.direktor`) : ""}
            {creatorDept ? <span> · {creatorDept}</span> : null}
          </p>
        </div>
        <span className="text-xs text-[var(--muted)] tabular shrink-0">{formatDate(task.createdAt)}</span>
      </div>

      {task.description && (
        <div className="border-t border-[var(--border)] px-5 sm:px-6 py-4">
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-pretty">{task.description}</p>
        </div>
      )}
    </Card>
  );
}
