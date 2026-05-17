import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { departments as deptsTbl, users as usersTbl } from "@/lib/db/schema";
import { TaskStatusBadge } from "./task-status-badge";

type Props = {
  creator: { id: string; fullName: string; position?: string | null } | null;
  task: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
    deadline: Date | null;
    createdAt: Date;
  };
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-14 rounded-full bg-[var(--secondary)] flex items-center justify-center font-semibold text-xl text-[var(--muted-foreground)]">
      {initials}
    </div>
  );
}

export async function TaskHeaderCard({ creator, task }: Props) {
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

  const fmtDate = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "—";

  const overdue = task.deadline && new Date(task.deadline) < new Date() && !["completed", "rejected"].includes(task.status);

  return (
    <Card>
      <div className="p-6 flex items-center gap-4 border-b">
        <Initials name={creator?.fullName ?? "—"} />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{creator?.fullName ?? "—"}</h2>
          <p className="text-sm text-[var(--muted)]">
            {creatorPosition ? t(`positions.${creatorPosition}` as `positions.direktor`) : ""}
            {creatorDept ? <span> · {creatorDept}</span> : null}
          </p>
        </div>
        {task.deadline && (
          <div className="text-right">
            <p className="text-sm text-[var(--muted)]">{t("tasks.fields.deadline")}</p>
            <p className={`text-2xl font-semibold ${overdue ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>
              {fmtDate(task.deadline)}
            </p>
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 mb-6 text-sm">
          <div>
            <p className="text-[var(--muted)] mb-1">{t("common.created")}</p>
            <p className="font-medium">{fmtDate(task.createdAt)}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] mb-1">{t("common.priority")}</p>
            <p className="font-medium">{t(`tasks.priority.${task.priority}` as "tasks.priority.low")}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] mb-1">{t("common.status")}</p>
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
        <div>
          <p className="text-[var(--muted)] mb-2">{t("tasks.sections.description")}</p>
          <p className="text-base whitespace-pre-wrap leading-relaxed">
            {task.description || <span className="text-[var(--muted)]">{t("tasks.sections.noDescription")}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
