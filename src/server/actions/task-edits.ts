"use server";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks, taskAssignees, users } from "@/lib/db/schema";
import { taskDeadlineRequests } from "@/lib/db/tables/task-edit";
import { requireUser, type SessionUser } from "@/lib/session";
import { canAssignTaskTo, type ActorContext } from "@/lib/permissions";
import { TASK_PRIORITIES } from "@/lib/permissions/tasks";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import {
  approvalMovesDeadline,
  buildTaskDiff,
  canManageTask,
  diffDaysIso,
  extensionDateError,
  fmtDdMm,
  isIsoDate,
  isOpenAssigneeStatus,
  isoToDeadline,
  removalBlocker,
  toTashkentIso,
  touchesLockedFields,
  type TaskEditErrorCode,
  type TaskEditResult,
} from "@/components/staff/task-edit/task-edit-logic";

// ---------------------------------------------------------------- internals

/** Expected, user-facing failure. Converted into `{ ok: false, error }` by `run`. */
class TaskEditError extends Error {
  constructor(
    public code: TaskEditErrorCode,
    public detail?: string
  ) {
    super(code);
  }
}

function pgCode(e: unknown): string | undefined {
  const err = e as { code?: unknown; cause?: { code?: unknown } } | null;
  if (err && typeof err.code === "string") return err.code;
  if (err?.cause && typeof err.cause.code === "string") return err.cause.code;
  return undefined;
}

/**
 * Wraps an action body: domain errors and validation errors become result values
 * (production builds strip thrown messages); anything else — including Next's
 * redirect from requireUser — is rethrown untouched.
 */
async function run<T extends object>(fn: () => Promise<T>): Promise<TaskEditResult<T>> {
  try {
    const value = await fn();
    return { ok: true, ...value };
  } catch (e) {
    if (e instanceof TaskEditError) return { ok: false, error: e.code, ...(e.detail ? { detail: e.detail } : {}) };
    if (e instanceof z.ZodError) return { ok: false, error: "invalid" };
    // 42P01 = undefined_table: the 0031 migration is not applied yet.
    if (pgCode(e) === "42P01") return { ok: false, error: "unavailable" };
    throw e;
  }
}

const uuid = z.string().uuid();
const isoDate = z.string().refine(isIsoDate, "invalid_date");

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  deadline: Date | null;
  registrationNumber: string | null;
  createdByUserId: string;
  assignedToUserId: string;
};

async function loadTask(taskId: string): Promise<TaskRow> {
  const [t] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      deadline: tasks.deadline,
      registrationNumber: tasks.registrationNumber,
      createdByUserId: tasks.createdByUserId,
      assignedToUserId: tasks.assignedToUserId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!t) throw new TaskEditError("not_found");
  return t;
}

function assertCanManage(me: SessionUser, t: TaskRow) {
  if (!canManageTask(me, t)) throw new TaskEditError("forbidden");
}

const taskTitle = (t: TaskRow) => (t.registrationNumber ? `${t.registrationNumber}: ${t.title}` : t.title);

function revalidateTask(taskId: string) {
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/contractor/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

/** Notifies users with a per-recipient link (studio contractors use their own portal). */
async function notifyWithLinks(
  userIds: string[],
  args: { type: string; title: string; message: string; taskId: string }
) {
  const ids = Array.from(new Set(userIds));
  if (ids.length === 0) return;
  const rows = await db.select({ id: users.id, position: users.position }).from(users).where(inArray(users.id, ids));
  const staff = rows.filter((u) => u.position !== "kontragent").map((u) => u.id);
  const contractors = rows.filter((u) => u.position === "kontragent").map((u) => u.id);
  const base = { type: args.type, title: args.title, message: args.message, entityType: "task", entityId: args.taskId };
  if (staff.length > 0) await notify({ ...base, userIds: staff, link: `/tasks/${args.taskId}` });
  if (contractors.length > 0) await notify({ ...base, userIds: contractors, link: `/contractor/tasks/${args.taskId}` });
}

/** Assignees that still work on the task (status <> completed). */
async function openAssigneeIds(taskId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: taskAssignees.userId, status: taskAssignees.status })
    .from(taskAssignees)
    .where(eq(taskAssignees.taskId, taskId));
  return rows.filter((r) => r.status !== "completed").map((r) => r.userId);
}

const deadlineChangedMessage = (oldIso: string | null, newIso: string | null) =>
  `Muddat oʻzgardi: ${fmtDdMm(oldIso)} → ${fmtDdMm(newIso)} / Срок изменён: ${fmtDdMm(oldIso)} → ${fmtDdMm(newIso)}`;

/** Activity payloads stay readable on the audit page even for long descriptions. */
const clip = (v: unknown) => (typeof v === "string" && v.length > 2000 ? `${v.slice(0, 2000)}…` : v);
const clipAll = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clip(v)]));

// ---------------------------------------------------------------- 1. edit task

const updateSchema = z.object({
  taskId: uuid,
  title: z.string().trim().min(2).max(500),
  description: z.string().max(20000).nullable(),
  priority: z.enum(TASK_PRIORITIES),
  deadlineDate: isoDate.nullable(),
});

export async function updateTask(input: {
  taskId: string;
  title: string;
  description: string | null;
  priority: (typeof TASK_PRIORITIES)[number];
  deadlineDate: string | null;
}): Promise<TaskEditResult<{ changed: string[] }>> {
  return run(async () => {
    const me = await requireUser();
    const p = updateSchema.parse(input);
    const t = await loadTask(p.taskId);
    assertCanManage(me, t);

    const prevDeadline = t.deadline ? toTashkentIso(t.deadline) : null;
    const diff = buildTaskDiff(
      { title: t.title, description: t.description, priority: t.priority, deadlineDate: prevDeadline },
      { title: p.title, description: p.description, priority: p.priority, deadlineDate: p.deadlineDate }
    );
    if (diff.changed.length === 0) return { changed: [] as string[] };
    if (t.status === "completed" && touchesLockedFields(diff)) throw new TaskEditError("task_completed");

    const set: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
    if (diff.changed.includes("title")) set.title = diff.next.title as string;
    if (diff.changed.includes("description")) set.description = diff.next.description ?? null;
    if (diff.changed.includes("priority")) set.priority = diff.next.priority as string;
    if (diff.changed.includes("deadlineDate")) set.deadline = diff.next.deadlineDate ? isoToDeadline(diff.next.deadlineDate) : null;
    await db.update(tasks).set(set).where(eq(tasks.id, t.id));

    await logActivity({
      userId: me.id,
      action: "task.updated",
      entityType: "task",
      entityId: t.id,
      oldValue: clipAll(diff.old),
      newValue: clipAll(diff.next),
    });

    if (diff.changed.includes("deadlineDate")) {
      const recipients = (await openAssigneeIds(t.id)).filter((id) => id !== me.id);
      await notifyWithLinks(recipients, {
        type: "task.deadline_changed",
        title: taskTitle({ ...t, title: (diff.next.title as string | undefined) ?? t.title }),
        message: deadlineChangedMessage(prevDeadline, diff.next.deadlineDate ?? null),
        taskId: t.id,
      });
    }

    revalidateTask(t.id);
    return { changed: diff.changed as string[] };
  });
}

// ---------------------------------------------------------------- 2. add / remove assignees

const addSchema = z.object({
  taskId: uuid,
  userIds: z.array(uuid).min(1).max(20),
});

export async function addTaskAssignees(taskId: string, userIds: string[]): Promise<TaskEditResult<{ added: string[] }>> {
  return run(async () => {
    const me = await requireUser();
    const p = addSchema.parse({ taskId, userIds });
    const ids = Array.from(new Set(p.userIds));
    const t = await loadTask(p.taskId);
    assertCanManage(me, t);
    if (t.status === "completed") throw new TaskEditError("task_completed");

    const actor: ActorContext = { id: me.id, position: me.position, departmentId: me.departmentId };
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        position: users.position,
        departmentId: users.departmentId,
        status: users.status,
        hidden: users.hidden,
      })
      .from(users)
      .where(inArray(users.id, ids));
    const byId = new Map(rows.map((u) => [u.id, u]));
    for (const id of ids) {
      const u = byId.get(id);
      if (!u) throw new TaskEditError("assignee_not_found");
      const target: ActorContext = { id: u.id, position: u.position, departmentId: u.departmentId };
      const allowed = u.status === "active" && !u.hidden && (await canAssignTaskTo(actor, target));
      if (!allowed) throw new TaskEditError("forbidden_assign", u.fullName);
    }

    // Existing assignees are skipped; the parent task status is left as is
    // (a completed task never gets here, so nothing is reopened).
    const inserted = await db
      .insert(taskAssignees)
      .values(ids.map((uid) => ({ taskId: t.id, userId: uid, status: "in_progress" as const })))
      .onConflictDoNothing()
      .returning({ userId: taskAssignees.userId });
    const added = inserted.map((r) => r.userId);
    if (added.length === 0) return { added };

    await db.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, t.id));
    await logActivity({
      userId: me.id,
      action: "task.assignees_added",
      entityType: "task",
      entityId: t.id,
      newValue: { userIds: added },
    });
    await notify({
      userIds: added,
      type: "task.assigned",
      title: taskTitle(t),
      message: "Sizga yangi topshiriq yuklandi",
      link: `/tasks/${t.id}`,
      entityType: "task",
      entityId: t.id,
    });

    revalidateTask(t.id);
    return { added };
  });
}

const removeSchema = z.object({ taskId: uuid, userId: uuid });

export async function removeTaskAssignee(
  taskId: string,
  userId: string
): Promise<TaskEditResult<{ autoCompleted: boolean }>> {
  return run(async () => {
    const me = await requireUser();
    const p = removeSchema.parse({ taskId, userId });
    const t = await loadTask(p.taskId);
    assertCanManage(me, t);

    const rows = await db
      .select({
        userId: taskAssignees.userId,
        status: taskAssignees.status,
        responseSubmittedAt: taskAssignees.responseSubmittedAt,
      })
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, t.id))
      .orderBy(asc(taskAssignees.createdAt));
    const row = rows.find((r) => r.userId === p.userId);
    if (!row) throw new TaskEditError("not_found");
    const blocker = removalBlocker(row, rows.length);
    if (blocker) throw new TaskEditError(blocker);

    const autoCompleted = await db.transaction(async (tx) => {
      await tx.delete(taskAssignees).where(and(eq(taskAssignees.taskId, t.id), eq(taskAssignees.userId, p.userId)));
      const remaining = await tx
        .select({ userId: taskAssignees.userId, status: taskAssignees.status })
        .from(taskAssignees)
        .where(eq(taskAssignees.taskId, t.id))
        .orderBy(asc(taskAssignees.createdAt));
      if (remaining.length === 0) throw new TaskEditError("last_assignee"); // concurrent removal — roll back

      const set: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
      if (t.assignedToUserId === p.userId) set.assignedToUserId = remaining[0].userId;
      // Same auto-sync as reviewAssigneeResponse: everyone left has finished → task is done.
      const allDone = remaining.every((r) => r.status === "completed");
      if (allDone && t.status !== "completed") {
        set.status = "completed";
        set.completedAt = new Date();
      }
      await tx.update(tasks).set(set).where(eq(tasks.id, t.id));
      return allDone && t.status !== "completed";
    });

    // A removed assignee's pending extension request is moot now.
    try {
      await db
        .update(taskDeadlineRequests)
        .set({ status: "cancelled", decidedAt: new Date(), decidedByUserId: me.id })
        .where(
          and(
            eq(taskDeadlineRequests.taskId, t.id),
            eq(taskDeadlineRequests.requestedByUserId, p.userId),
            eq(taskDeadlineRequests.status, "pending")
          )
        );
    } catch {
      /* 0031 not applied yet */
    }

    await logActivity({
      userId: me.id,
      action: "task.assignee_removed",
      entityType: "task",
      entityId: t.id,
      newValue: { userId: p.userId, ...(autoCompleted ? { autoCompleted: true } : {}) },
    });
    if (p.userId !== me.id) {
      await notifyWithLinks([p.userId], {
        type: "task.unassigned",
        title: taskTitle(t),
        message: "Siz topshiriq ijrochilaridan chiqarildingiz / Вы исключены из исполнителей поручения",
        taskId: t.id,
      });
    }

    revalidateTask(t.id);
    return { autoCompleted };
  });
}

// ---------------------------------------------------------------- 3. deadline extension requests

const requestSchema = z.object({
  taskId: uuid,
  requestedDate: isoDate,
  reason: z.string().trim().min(3).max(1000),
});

export async function requestDeadlineExtension(input: {
  taskId: string;
  requestedDate: string;
  reason: string;
}): Promise<TaskEditResult<{ id: string }>> {
  return run(async () => {
    const me = await requireUser();
    // Studio contractors keep using the studio stage-request flow.
    if (me.position === "kontragent") throw new TaskEditError("forbidden");
    const p = requestSchema.parse(input);
    const t = await loadTask(p.taskId);

    const [mine] = await db
      .select({ status: taskAssignees.status })
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, t.id), eq(taskAssignees.userId, me.id)))
      .limit(1);
    if (!mine || !isOpenAssigneeStatus(mine.status)) throw new TaskEditError("not_assignee");
    if (t.status === "completed") throw new TaskEditError("task_completed");

    const currentIso = t.deadline ? toTashkentIso(t.deadline) : null;
    const dateError = extensionDateError(p.requestedDate, currentIso, toTashkentIso(new Date()));
    if (dateError) throw new TaskEditError(dateError);

    let id: string;
    try {
      const [row] = await db
        .insert(taskDeadlineRequests)
        .values({
          taskId: t.id,
          requestedByUserId: me.id,
          previousDeadline: t.deadline,
          requestedDeadline: isoToDeadline(p.requestedDate),
          reason: p.reason,
        })
        .returning({ id: taskDeadlineRequests.id });
      id = row.id;
    } catch (e) {
      if (pgCode(e) === "23505") throw new TaskEditError("already_pending");
      throw e;
    }

    await logActivity({
      userId: me.id,
      action: "task.deadline_requested",
      entityType: "task",
      entityId: t.id,
      newValue: { requestId: id, previousDate: currentIso, requestedDate: p.requestedDate, reason: p.reason },
    });
    if (t.createdByUserId !== me.id) {
      const days = diffDaysIso(currentIso as string, p.requestedDate);
      await notify({
        userIds: [t.createdByUserId],
        type: "task.deadline_request",
        title: taskTitle(t),
        message: `${me.fullName}: +${days} kun — ${p.reason.slice(0, 200)}`,
        link: `/tasks/${t.id}`,
        entityType: "task",
        entityId: t.id,
      });
    }

    revalidateTask(t.id);
    return { id };
  });
}

export async function cancelDeadlineRequest(requestId: string): Promise<TaskEditResult> {
  return run(async () => {
    const me = await requireUser();
    const id = uuid.parse(requestId);
    const [r] = await db
      .select({
        id: taskDeadlineRequests.id,
        taskId: taskDeadlineRequests.taskId,
        requestedByUserId: taskDeadlineRequests.requestedByUserId,
        status: taskDeadlineRequests.status,
      })
      .from(taskDeadlineRequests)
      .where(eq(taskDeadlineRequests.id, id))
      .limit(1);
    if (!r) throw new TaskEditError("not_found");
    if (r.requestedByUserId !== me.id) throw new TaskEditError("forbidden");
    if (r.status !== "pending") throw new TaskEditError("not_pending");

    const updated = await db
      .update(taskDeadlineRequests)
      .set({ status: "cancelled", decidedAt: new Date() })
      .where(and(eq(taskDeadlineRequests.id, r.id), eq(taskDeadlineRequests.status, "pending")))
      .returning({ id: taskDeadlineRequests.id });
    if (updated.length === 0) throw new TaskEditError("not_pending");

    await logActivity({
      userId: me.id,
      action: "task.deadline_request_cancelled",
      entityType: "task",
      entityId: r.taskId,
      newValue: { requestId: r.id },
    });
    revalidateTask(r.taskId);
    return {};
  });
}

const decideSchema = z.object({
  requestId: uuid,
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).optional(),
});

export async function decideDeadlineRequest(input: {
  requestId: string;
  decision: "approved" | "rejected";
  note?: string;
}): Promise<TaskEditResult> {
  return run(async () => {
    const me = await requireUser();
    const p = decideSchema.parse(input);
    const [r] = await db
      .select({
        id: taskDeadlineRequests.id,
        taskId: taskDeadlineRequests.taskId,
        requestedByUserId: taskDeadlineRequests.requestedByUserId,
        requestedDeadline: taskDeadlineRequests.requestedDeadline,
        status: taskDeadlineRequests.status,
      })
      .from(taskDeadlineRequests)
      .where(eq(taskDeadlineRequests.id, p.requestId))
      .limit(1);
    if (!r) throw new TaskEditError("not_found");
    const t = await loadTask(r.taskId);
    assertCanManage(me, t);
    if (r.status !== "pending") throw new TaskEditError("not_pending");
    const note = p.note?.trim() || null;
    if (p.decision === "rejected" && (!note || note.length < 2)) throw new TaskEditError("note_required");
    // A completed task only allows description edits — approving would move its deadline.
    if (p.decision === "approved" && t.status === "completed") throw new TaskEditError("task_completed");

    const oldIso = t.deadline ? toTashkentIso(t.deadline) : null;
    const newIso = toTashkentIso(r.requestedDeadline);
    // Never shorten: another request (or a manual edit) may already have moved the
    // deadline past this one. The request is still marked approved.
    const movesDeadline = p.decision === "approved" && approvalMovesDeadline(oldIso, newIso);

    const now = new Date();
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(taskDeadlineRequests)
        .set({ status: p.decision, decidedByUserId: me.id, decidedAt: now, decisionNote: note })
        .where(and(eq(taskDeadlineRequests.id, r.id), eq(taskDeadlineRequests.status, "pending")))
        .returning({ id: taskDeadlineRequests.id });
      if (updated.length === 0) throw new TaskEditError("not_pending");
      if (movesDeadline) {
        await tx.update(tasks).set({ deadline: r.requestedDeadline, updatedAt: now }).where(eq(tasks.id, t.id));
      }
    });

    await logActivity({
      userId: me.id,
      action: `task.deadline_request_${p.decision}`,
      entityType: "task",
      entityId: t.id,
      newValue: { requestId: r.id, old: oldIso, new: newIso, note },
    });

    await notifyWithLinks([r.requestedByUserId], {
      type: "task.deadline_request_decided",
      title: taskTitle(t),
      message:
        p.decision === "approved"
          ? `Muddat uzaytirildi: ${fmtDdMm(movesDeadline ? newIso : oldIso)} / Срок продлён: ${fmtDdMm(movesDeadline ? newIso : oldIso)}`
          : `Muddat soʻrovi rad etildi: ${note} / Запрос на продление отклонён: ${note}`,
      taskId: t.id,
    });
    if (movesDeadline) {
      const others = (await openAssigneeIds(t.id)).filter((id) => id !== r.requestedByUserId && id !== me.id);
      await notifyWithLinks(others, {
        type: "task.deadline_changed",
        title: taskTitle(t),
        message: deadlineChangedMessage(oldIso, newIso),
        taskId: t.id,
      });
    }

    revalidateTask(t.id);
    return {};
  });
}
