"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { councilAgendaItems, councilMeetings, projects, tasks, users } from "@/lib/db/schema";
import { councilResolutions } from "@/lib/db/tables/council-resolutions";
import { requirePosition, type SessionUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { can } from "@/lib/permissions/capabilities";
import { TASK_PRIORITIES } from "@/lib/permissions/tasks";
import { createTask } from "@/server/actions/tasks";
import { addAgendaItem } from "@/server/actions/councils";
import { canEditResolutions } from "@/server/queries/council-resolutions";
import {
  COUNCIL_KIND_LABEL_UZ,
  STAFF_POSITIONS,
  canCancelResolution,
  canCloseResolution,
  carryoverTopic,
  ddmmyyyy,
  effectiveStatus,
  isActiveStatus,
  isCouncilKind,
  isValidIsoDate,
  resolutionTaskDescription,
  resolutionTaskTitle,
  taskDeadlineFromDue,
  tashkentDateOf,
  tashkentToday,
} from "@/lib/councils/resolution-status";

/**
 * Kengash qarorlari ijrosi — server actions.
 *
 * Expected business failures are RETURNED as `{ ok: false, error }` (production builds
 * mask thrown messages); only unexpected errors throw. Every id coming from the client
 * is re-checked against the DB: the meeting / agenda item / responsible user must exist
 * and the caller's rights are evaluated per meeting (creator or resolution editor).
 */

export type ResolutionError =
  | "forbidden"
  | "not_found"
  | "invalid"
  | "unavailable"
  | "task_linked"
  | "not_open"
  | "already_tasked"
  | "need_responsible_and_due"
  | "forbidden_assign"
  | "bad_responsible"
  | "bad_agenda"
  | "already_added";

type Fail = { ok: false; error: ResolutionError };
type Ok<T extends object = object> = { ok: true } & T;
export type ResolutionResult<T extends object = object> = Ok<T> | Fail;

const fail = (error: ResolutionError): Fail => ({ ok: false, error });

/** Postgres "undefined_table" (42P01), possibly wrapped by drizzle's query error. */
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "42P01" || err?.cause?.code === "42P01";
}

/** Runs an action body; a missing table (migration 0031 not yet applied) becomes "unavailable". */
async function guard<T extends object>(fn: () => Promise<ResolutionResult<T>>): Promise<ResolutionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable(e)) return fail("unavailable");
    throw e;
  }
}

const RFC_UUID = z.uuid();
const isoDate = z.string().refine((s) => isValidIsoDate(s), "invalid_date");
const LINK_MINE = "/kengashlar/ijro?mine=1";

function revalidate(kind: string) {
  revalidatePath(`/kengashlar/${kind}`);
  revalidatePath("/kengashlar/ijro");
  // Locale-prefixed routes: invalidate every locale of both pages.
  revalidatePath("/[locale]/(dashboard)/kengashlar/[kind]", "page");
  revalidatePath("/[locale]/(dashboard)/kengashlar/ijro", "page");
}

function kindLabel(kind: string): string {
  return isCouncilKind(kind) ? COUNCIL_KIND_LABEL_UZ[kind] : kind;
}

async function me(): Promise<SessionUser> {
  return requirePosition([...STAFF_POSITIONS]);
}

/** A resolution with everything the permission checks need. */
async function loadResolution(id: string) {
  const [r] = await db
    .select({
      id: councilResolutions.id,
      meetingId: councilResolutions.meetingId,
      number: councilResolutions.number,
      text: councilResolutions.text,
      agendaItemId: councilResolutions.agendaItemId,
      responsibleUserId: councilResolutions.responsibleUserId,
      dueDate: councilResolutions.dueDate,
      taskId: councilResolutions.taskId,
      status: councilResolutions.status,
      kind: councilMeetings.kind,
      scheduledAt: councilMeetings.scheduledAt,
      meetingCreatorId: councilMeetings.createdByUserId,
      projectId: councilAgendaItems.projectId,
      projectName: sql<string | null>`coalesce(${projects.name}, ${councilAgendaItems.projectName})`,
      responsibleName: users.fullName,
      taskStatus: tasks.status,
    })
    .from(councilResolutions)
    .innerJoin(councilMeetings, eq(councilMeetings.id, councilResolutions.meetingId))
    .leftJoin(councilAgendaItems, eq(councilAgendaItems.id, councilResolutions.agendaItemId))
    .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
    .leftJoin(users, eq(users.id, councilResolutions.responsibleUserId))
    .leftJoin(tasks, eq(tasks.id, councilResolutions.taskId))
    .where(eq(councilResolutions.id, id))
    .limit(1);
  if (!r) return null;
  return {
    ...r,
    meetingDay: tashkentDateOf(r.scheduledAt),
    effective: effectiveStatus({ status: r.status, dueDate: r.dueDate, taskStatus: r.taskStatus }, tashkentToday()),
  };
}

async function loadMeeting(id: string) {
  const [m] = await db
    .select({
      id: councilMeetings.id,
      kind: councilMeetings.kind,
      scheduledAt: councilMeetings.scheduledAt,
      createdByUserId: councilMeetings.createdByUserId,
    })
    .from(councilMeetings)
    .where(eq(councilMeetings.id, id))
    .limit(1);
  return m ?? null;
}

/** The agenda item must belong to the same meeting. */
async function agendaBelongs(agendaItemId: string, meetingId: string): Promise<boolean> {
  const [a] = await db
    .select({ id: councilAgendaItems.id })
    .from(councilAgendaItems)
    .where(and(eq(councilAgendaItems.id, agendaItemId), eq(councilAgendaItems.meetingId, meetingId)))
    .limit(1);
  return !!a;
}

/** A responsible person must be an active, visible staff member (the audience of /kengashlar/ijro). */
async function responsibleOk(userId: string): Promise<boolean> {
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.status, "active"),
        eq(users.hidden, false),
        inArray(users.position, [...STAFF_POSITIONS])
      )
    )
    .limit(1);
  return !!u;
}

async function notifyAssigned(
  userId: string | null | undefined,
  actorId: string,
  r: { id: string; number: number; text: string; kind: string; meetingDay: string }
) {
  if (!userId || userId === actorId) return;
  await notify({
    userIds: [userId],
    type: "council.resolution_assigned",
    title: `Kengash qarori №${r.number}`,
    message: `${kindLabel(r.kind)}, ${ddmmyyyy(r.meetingDay)}: ${r.text.slice(0, 300)}`,
    link: LINK_MINE,
    entityType: "council_resolution",
    entityId: r.id,
  });
}

// ---------------------------------------------------------------- add

const addSchema = z.object({
  meetingId: z.guid(),
  text: z.string().trim().min(3).max(5000),
  agendaItemId: z.guid().nullish(),
  responsibleUserId: z.guid().nullish(),
  dueDate: isoDate.nullish(),
});

export async function addResolution(input: z.input<typeof addSchema>): Promise<ResolutionResult<{ id: string; number: number }>> {
  const user = await me();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const p = parsed.data;
  return guard(async () => {
    const meeting = await loadMeeting(p.meetingId);
    if (!meeting) return fail("not_found");
    if (!(await canEditResolutions(user, meeting.createdByUserId))) return fail("forbidden");
    if (p.agendaItemId && !(await agendaBelongs(p.agendaItemId, meeting.id))) return fail("bad_agenda");
    if (p.responsibleUserId && !(await responsibleOk(p.responsibleUserId))) return fail("bad_responsible");

    // Serialise numbering per meeting so two concurrent adds never share a number.
    const row = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`council_resolutions:${meeting.id}`}))`);
      const [{ next }] = await tx
        .select({ next: sql<number>`coalesce(max(${councilResolutions.number}), 0) + 1` })
        .from(councilResolutions)
        .where(eq(councilResolutions.meetingId, meeting.id));
      const [ins] = await tx
        .insert(councilResolutions)
        .values({
          meetingId: meeting.id,
          number: Number(next) || 1,
          text: p.text,
          agendaItemId: p.agendaItemId ?? null,
          responsibleUserId: p.responsibleUserId ?? null,
          dueDate: p.dueDate ?? null,
          status: "open",
          createdByUserId: user.id,
        })
        .returning({ id: councilResolutions.id, number: councilResolutions.number });
      return ins;
    });

    await logActivity({
      userId: user.id,
      action: "council.resolution_added",
      entityType: "council_meeting",
      entityId: meeting.id,
      newValue: { resolutionId: row.id, number: row.number, responsibleUserId: p.responsibleUserId ?? null, dueDate: p.dueDate ?? null },
    });
    await notifyAssigned(p.responsibleUserId, user.id, {
      id: row.id,
      number: row.number,
      text: p.text,
      kind: meeting.kind,
      meetingDay: tashkentDateOf(meeting.scheduledAt),
    });
    revalidate(meeting.kind);
    return { ok: true, id: row.id, number: row.number };
  });
}

// ---------------------------------------------------------------- update

const updateSchema = z.object({
  id: z.guid(),
  text: z.string().trim().min(3).max(5000).optional(),
  agendaItemId: z.guid().nullable().optional(),
  responsibleUserId: z.guid().nullable().optional(),
  dueDate: isoDate.nullable().optional(),
});

export async function updateResolution(input: z.input<typeof updateSchema>): Promise<ResolutionResult> {
  const user = await me();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const p = parsed.data;
  return guard(async () => {
    const r = await loadResolution(p.id);
    if (!r) return fail("not_found");
    if (!(await canEditResolutions(user, r.meetingCreatorId))) return fail("forbidden");

    const responsibleChanged = p.responsibleUserId !== undefined && p.responsibleUserId !== r.responsibleUserId;
    const dueChanged = p.dueDate !== undefined && p.dueDate !== r.dueDate;
    // A tasked point follows its task: only the text and the agenda item may change.
    if ((responsibleChanged || dueChanged) && r.taskId) return fail("task_linked");
    if ((responsibleChanged || dueChanged) && r.status !== "open") return fail("not_open");
    if (p.agendaItemId && p.agendaItemId !== r.agendaItemId && !(await agendaBelongs(p.agendaItemId, r.meetingId))) {
      return fail("bad_agenda");
    }
    if (responsibleChanged && p.responsibleUserId && !(await responsibleOk(p.responsibleUserId))) return fail("bad_responsible");

    const patch: Partial<typeof councilResolutions.$inferInsert> = {};
    if (p.text !== undefined && p.text !== r.text) patch.text = p.text;
    if (p.agendaItemId !== undefined && p.agendaItemId !== r.agendaItemId) patch.agendaItemId = p.agendaItemId;
    if (responsibleChanged) patch.responsibleUserId = p.responsibleUserId ?? null;
    if (dueChanged) patch.dueDate = p.dueDate ?? null;
    if (responsibleChanged || dueChanged) {
      // Re-arm the worker reminders for the new person / date.
      patch.reminderDueSentAt = null;
      patch.reminderOverdueSentAt = null;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    await db.update(councilResolutions).set(patch).where(eq(councilResolutions.id, r.id));
    await logActivity({
      userId: user.id,
      action: "council.resolution_updated",
      entityType: "council_meeting",
      entityId: r.meetingId,
      oldValue: { resolutionId: r.id, text: r.text, agendaItemId: r.agendaItemId, responsibleUserId: r.responsibleUserId, dueDate: r.dueDate },
      newValue: { resolutionId: r.id, ...patch },
    });
    if (responsibleChanged) {
      await notifyAssigned(p.responsibleUserId, user.id, { ...r, text: patch.text ?? r.text });
    }
    revalidate(r.kind);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- cancel

const noteSchema = z.object({ id: z.guid(), note: z.string().trim().min(2).max(2000) });

export async function cancelResolution(input: z.input<typeof noteSchema>): Promise<ResolutionResult> {
  const user = await me();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const p = parsed.data;
  return guard(async () => {
    const r = await loadResolution(p.id);
    if (!r) return fail("not_found");
    const canEdit = await canEditResolutions(user, r.meetingCreatorId);
    if (!canEdit) return fail("forbidden");
    if (!canCancelResolution(r, canEdit)) return fail("not_open");

    const updated = await db
      .update(councilResolutions)
      .set({ status: "cancelled", closedNote: p.note, closedAt: new Date(), closedByUserId: user.id })
      .where(and(eq(councilResolutions.id, r.id), eq(councilResolutions.status, "open")))
      .returning({ id: councilResolutions.id });
    if (updated.length === 0) return fail("not_open");

    await logActivity({
      userId: user.id,
      action: "council.resolution_cancelled",
      entityType: "council_meeting",
      entityId: r.meetingId,
      newValue: { resolutionId: r.id, number: r.number, note: p.note },
    });
    if (r.responsibleUserId && r.responsibleUserId !== user.id) {
      await notify({
        userIds: [r.responsibleUserId],
        type: "council.resolution_cancelled",
        title: `Kengash qarori №${r.number} bekor qilindi / Решение совета №${r.number} отменено`,
        message: p.note.slice(0, 300),
        link: LINK_MINE,
        entityType: "council_resolution",
        entityId: r.id,
      });
    }
    revalidate(r.kind);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- delete

export async function deleteResolution(id: string): Promise<ResolutionResult> {
  const user = await me();
  if (!z.guid().safeParse(id).success) return fail("invalid");
  return guard(async () => {
    const r = await loadResolution(id);
    if (!r) return fail("not_found");
    if (!(await canEditResolutions(user, r.meetingCreatorId))) return fail("forbidden");
    if (r.taskId) return fail("task_linked");

    const deleted = await db
      .delete(councilResolutions)
      .where(and(eq(councilResolutions.id, r.id), isNull(councilResolutions.taskId)))
      .returning({ id: councilResolutions.id });
    if (deleted.length === 0) return fail("task_linked");

    await logActivity({
      userId: user.id,
      action: "council.resolution_deleted",
      entityType: "council_meeting",
      entityId: r.meetingId,
      oldValue: { resolutionId: r.id, number: r.number, text: r.text },
    });
    revalidate(r.kind);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- close (done)

export async function closeResolution(input: z.input<typeof noteSchema>): Promise<ResolutionResult> {
  const user = await me();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const p = parsed.data;
  return guard(async () => {
    const r = await loadResolution(p.id);
    if (!r) return fail("not_found");
    const canEdit = await canEditResolutions(user, r.meetingCreatorId);
    if (!canCloseResolution(r, user, canEdit)) {
      if (r.status !== "open" || r.effective === "done" || r.effective === "cancelled") return fail("not_open");
      if (r.taskId && user.position !== "direktor") return fail("task_linked");
      return fail("forbidden");
    }

    const updated = await db
      .update(councilResolutions)
      .set({ status: "done", closedNote: p.note, closedAt: new Date(), closedByUserId: user.id })
      .where(and(eq(councilResolutions.id, r.id), eq(councilResolutions.status, "open")))
      .returning({ id: councilResolutions.id });
    if (updated.length === 0) return fail("not_open");

    await logActivity({
      userId: user.id,
      action: "council.resolution_closed",
      entityType: "council_meeting",
      entityId: r.meetingId,
      newValue: { resolutionId: r.id, number: r.number, note: p.note, override: !!r.taskId },
    });
    if (r.meetingCreatorId && r.meetingCreatorId !== user.id) {
      await notify({
        userIds: [r.meetingCreatorId],
        type: "council.resolution_closed",
        title: `Kengash qarori №${r.number} ijro etildi / Решение совета №${r.number} исполнено`,
        message: p.note.slice(0, 300),
        link: `/kengashlar/ijro?status=done`,
        entityType: "council_resolution",
        entityId: r.id,
      });
    }
    revalidate(r.kind);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- send as task

const sendSchema = z.object({ id: z.guid(), priority: z.enum(TASK_PRIORITIES).optional() });

export async function sendResolutionAsTask(
  input: z.input<typeof sendSchema>
): Promise<ResolutionResult<{ taskId: string; regNumber: string | null }>> {
  const user = await me();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const p = parsed.data;
  return guard(async () => {
    const r = await loadResolution(p.id);
    if (!r) return fail("not_found");
    if (!can(user.position, "tasks.assign") || !(await canEditResolutions(user, r.meetingCreatorId))) return fail("forbidden");
    if (r.taskId) return fail("already_tasked");
    if (r.status !== "open" || r.effective === "done" || r.effective === "cancelled") return fail("not_open");
    if (!r.responsibleUserId || !r.dueDate) return fail("need_responsible_and_due");
    // The responsible person may have been deactivated / hidden since the point was added;
    // createTask does not check that. Its schema also validates ids with strict z.uuid().
    if (!RFC_UUID.safeParse(r.responsibleUserId).success || !(await responsibleOk(r.responsibleUserId))) {
      return fail("bad_responsible");
    }
    const projectId = r.projectId && RFC_UUID.safeParse(r.projectId).success ? r.projectId : null;

    let created: { id: string };
    try {
      // createTask re-checks canAssignTaskTo, assigns the registration number and notifies.
      created = await createTask({
        title: resolutionTaskTitle(r.number, r.text),
        description: resolutionTaskDescription(r.text, r.kind, r.meetingDay),
        assignedToUserId: r.responsibleUserId,
        projectId,
        priority: p.priority ?? "high",
        deadline: taskDeadlineFromDue(r.dueDate),
      });
    } catch (e) {
      if (e instanceof z.ZodError) return fail("invalid");
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("forbidden_assign")) return fail("forbidden_assign");
      if (msg === "assignee_not_found") return fail("bad_responsible");
      throw e;
    }

    const linked = await db
      .update(councilResolutions)
      .set({ taskId: created.id })
      .where(and(eq(councilResolutions.id, r.id), isNull(councilResolutions.taskId)))
      .returning({ id: councilResolutions.id });
    if (linked.length === 0) {
      // Lost a race with a concurrent click: the point is already tasked elsewhere.
      console.warn(`council-resolutions: point ${r.id} was tasked concurrently; extra task ${created.id}`);
      return fail("already_tasked");
    }

    const [task] = await db
      .select({ reg: tasks.registrationNumber })
      .from(tasks)
      .where(eq(tasks.id, created.id))
      .limit(1);
    await logActivity({
      userId: user.id,
      action: "council.resolution_tasked",
      entityType: "council_meeting",
      entityId: r.meetingId,
      newValue: { resolutionId: r.id, number: r.number, taskId: created.id, registrationNumber: task?.reg ?? null },
    });
    revalidate(r.kind);
    return { ok: true, taskId: created.id, regNumber: task?.reg ?? null };
  });
}

// ---------------------------------------------------------------- carry-over to the next agenda

const carrySchema = z.object({ resolutionId: z.guid(), meetingId: z.guid() });

export async function addCarryoverToAgenda(input: z.input<typeof carrySchema>): Promise<ResolutionResult> {
  const user = await me();
  const parsed = carrySchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const p = parsed.data;
  return guard(async () => {
    const [r, target] = await Promise.all([loadResolution(p.resolutionId), loadMeeting(p.meetingId)]);
    if (!r || !target) return fail("not_found");
    if (!(await canEditResolutions(user, target.createdByUserId))) return fail("forbidden");
    // Only points of an EARLIER meeting of the same council can be carried over.
    if (target.kind !== r.kind || target.id === r.meetingId || r.scheduledAt.getTime() >= target.scheduledAt.getTime()) {
      return fail("invalid");
    }
    // Only still-open points are carried over (the card lists exactly these).
    if (r.status !== "open" || !isActiveStatus(r.effective)) return fail("not_open");

    const topic = carryoverTopic(r.number, r.meetingDay);
    const [dup] = await db
      .select({ id: councilAgendaItems.id })
      .from(councilAgendaItems)
      .where(and(eq(councilAgendaItems.meetingId, target.id), eq(councilAgendaItems.topic, topic)))
      .limit(1);
    if (dup) return fail("already_added");

    // addAgendaItem validates ids with z.uuid() (RFC); fall back to the free-text
    // name for legacy ids that are not RFC-versioned.
    const projectIdOk = !!r.projectId && RFC_UUID.safeParse(r.projectId).success;
    const presenterIdOk = !!r.responsibleUserId && RFC_UUID.safeParse(r.responsibleUserId).success;
    if (!RFC_UUID.safeParse(target.id).success) return fail("invalid");
    await addAgendaItem({
      meetingId: target.id,
      topic,
      projectId: projectIdOk ? r.projectId : null,
      // addAgendaItem caps both free-text names at 255 characters.
      projectName: projectIdOk ? null : (r.projectName?.slice(0, 255) ?? null),
      presenterUserId: presenterIdOk ? r.responsibleUserId : null,
      presenterName: presenterIdOk ? null : (r.responsibleName?.slice(0, 255) ?? null),
    });

    await logActivity({
      userId: user.id,
      action: "council.resolution_carried_over",
      entityType: "council_meeting",
      entityId: target.id,
      newValue: { resolutionId: r.id, number: r.number, fromMeetingId: r.meetingId, topic },
    });
    revalidate(target.kind);
    return { ok: true };
  });
}
