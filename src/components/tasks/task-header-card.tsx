import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center font-semibold text-lg text-[var(--primary-foreground)] shadow-soft">
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
    d ? new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d)) : "—";
  const fmtFull = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—";

  const overdue = task.deadline && new Date(task.deadline) < new Date() && !["completed", "rejected"].includes(task.status);

  return (
    <Card className="overflow-hidden">
      {task.registrationNumber && (
        <div className="px-7 pt-5 pb-3 border-b border-[var(--border)] flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] px-3 py-1 text-xs font-bold tabular tracking-tight">
            № {task.registrationNumber}
          </span>
        </div>
      )}
      <div className="p-7 flex flex-col md:flex-row md:items-center gap-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Initials name={creator?.fullName ?? "—"} />
          <div className="min-w-0">
            <h2 className="font-display text-[20px] font-bold tracking-tight truncate">{creator?.fullName ?? "—"}</h2>
            <p className="text-[14px] text-[var(--muted)] truncate">
              {creatorPosition ? t(`positions.${creatorPosition}` as `positions.direktor`) : ""}
              {creatorDept ? <span> · {creatorDept}</span> : null}
            </p>
          </div>
        </div>
        {task.deadline && (
          <div className={`shrink-0 rounded-xl px-5 py-3 border ${overdue ? "bg-[var(--danger-soft)] border-[var(--danger)]/20" : "bg-[var(--surface-2)] border-[var(--border)]"}`}>
            <p className="eyebrow mb-1">{t("tasks.fields.deadline")}</p>
            <p className={`font-display text-xl font-bold tracking-tight tabular ${overdue ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>
              {fmtDate(task.deadline)}
            </p>
          </div>
        )}
      </div>

      <div className="px-7 py-6 grid gap-6 sm:grid-cols-3 text-sm border-b border-[var(--border)]">
        <div>
          <p className="eyebrow mb-1.5">{t("common.created")}</p>
          <p className="font-medium tabular">{fmtFull(task.createdAt)}</p>
        </div>
        <div>
          <p className="eyebrow mb-1.5">{t("common.priority")}</p>
          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"}>{t(`tasks.priority.${task.priority}` as "tasks.priority.low")}</Badge>
        </div>
        <div>
          <p className="eyebrow mb-1.5">{t("common.status")}</p>
          <Badge variant={STATUS_VARIANT[task.status] ?? "secondary"}>{t(`tasks.status.${task.status}` as "tasks.status.todo")}</Badge>
        </div>
      </div>

      <div className="px-7 py-6">
        <p className="eyebrow mb-3">{t("tasks.sections.description")}</p>
        <p className="text-[15px] whitespace-pre-wrap leading-relaxed text-pretty">
          {task.description || <span className="text-[var(--muted)]">{t("tasks.sections.noDescription")}</span>}
        </p>
      </div>
    </Card>
  );
}
