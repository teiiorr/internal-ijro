import { and, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../src/lib/db/schema";
import { councilResolutions } from "../../src/lib/db/tables/council-resolutions";
import { deliverNotification } from "../../src/lib/notifications/deliver";
import {
  addDaysIso,
  dueReminderMessage,
  overdueReminderMessage,
  tashkentToday,
} from "../../src/lib/councils/resolution-status";

/**
 * Daily council-resolution reminders (run once from scripts/worker.ts at 08:00 Tashkent).
 *
 * Only points WITHOUT a task are handled here — a tasked point is covered by the task's
 * own reminders. Candidates: task_id IS NULL, status = 'open', responsible and due date set.
 *
 *   (a) due_date = today + 3 and reminder_due_sent_at IS NULL     → the responsible person
 *   (b) due_date < today     and reminder_overdue_sent_at IS NULL → responsible + meeting
 *       creator + active direktor / orinbosar
 *
 * The reminder_*_sent_at column is claimed with a conditional UPDATE before sending, so a
 * second run on the same day sends nothing; a failed delivery releases the claim. Before
 * migration 0031 the table is missing and the pass just logs and returns 0.
 * Relative imports only (no `server-only`, no "@/" alias).
 */

type Db = PostgresJsDatabase<typeof schema>;

const { councilMeetings, users } = schema;
const LINK_MINE = "/kengashlar/ijro?mine=1";
const LINK_OVERDUE = "/kengashlar/ijro?status=overdue";

const title = (n: number, text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return `Kengash qarori №${n}: ${t.length > 120 ? `${t.slice(0, 119)}…` : t}`;
};

export async function runCouncilResolutionReminders(db: Db, now = new Date()): Promise<number> {
  const today = tashkentToday(now);
  const dueDay = addDaysIso(today, 3);
  let sent = 0;

  const base = and(
    isNull(councilResolutions.taskId),
    eq(councilResolutions.status, "open"),
    isNotNull(councilResolutions.responsibleUserId),
    isNotNull(councilResolutions.dueDate)
  );

  // ---------- (a) due in 3 days ----------
  try {
    const rows = await db
      .select({
        id: councilResolutions.id,
        number: councilResolutions.number,
        text: councilResolutions.text,
        responsibleUserId: councilResolutions.responsibleUserId,
      })
      .from(councilResolutions)
      .innerJoin(users, eq(users.id, councilResolutions.responsibleUserId))
      .where(and(base, eq(councilResolutions.dueDate, dueDay), isNull(councilResolutions.reminderDueSentAt), eq(users.status, "active")));

    for (const r of rows) {
      if (!r.responsibleUserId) continue;
      const claimed = await db
        .update(councilResolutions)
        .set({ reminderDueSentAt: now })
        .where(and(eq(councilResolutions.id, r.id), isNull(councilResolutions.reminderDueSentAt)))
        .returning({ id: councilResolutions.id });
      if (claimed.length === 0) continue;
      try {
        await deliverNotification(db, {
          userIds: [r.responsibleUserId],
          type: "council.resolution_due",
          title: title(r.number, r.text),
          message: dueReminderMessage(r.number),
          link: LINK_MINE,
          entityType: "council_resolution",
          entityId: r.id,
        });
        sent++;
      } catch (e) {
        console.error(`council-resolutions: due reminder failed (${r.id})`, e);
        await db
          .update(councilResolutions)
          .set({ reminderDueSentAt: null })
          .where(eq(councilResolutions.id, r.id))
          .catch(() => undefined);
      }
    }
  } catch (e) {
    console.error("council-resolutions: due pass skipped", e);
  }

  // ---------- (b) overdue ----------
  try {
    const rows = await db
      .select({
        id: councilResolutions.id,
        number: councilResolutions.number,
        text: councilResolutions.text,
        dueDate: councilResolutions.dueDate,
        responsibleUserId: councilResolutions.responsibleUserId,
        meetingCreatorId: councilMeetings.createdByUserId,
      })
      .from(councilResolutions)
      .innerJoin(councilMeetings, eq(councilMeetings.id, councilResolutions.meetingId))
      .where(and(base, lt(councilResolutions.dueDate, today), isNull(councilResolutions.reminderOverdueSentAt)));

    if (rows.length > 0) {
      const leaders = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.status, "active"), inArray(users.position, ["direktor", "orinbosar"]), eq(users.hidden, false)));
      const leaderIds = leaders.map((u) => u.id);

      // Creators / responsibles must still be active internal employees.
      const people = Array.from(
        new Set(rows.flatMap((r) => [r.responsibleUserId, r.meetingCreatorId]).filter((x): x is string => !!x))
      );
      const activeRows = people.length
        ? await db
            .select({ id: users.id })
            .from(users)
            .where(and(inArray(users.id, people), eq(users.status, "active"), sql`${users.position} <> 'kontragent'`))
        : [];
      const active = new Set(activeRows.map((u) => u.id));

      for (const r of rows) {
        if (!r.responsibleUserId || !r.dueDate) continue;
        const claimed = await db
          .update(councilResolutions)
          .set({ reminderOverdueSentAt: now })
          .where(and(eq(councilResolutions.id, r.id), isNull(councilResolutions.reminderOverdueSentAt)))
          .returning({ id: councilResolutions.id });
        if (claimed.length === 0) continue;

        const responsible = active.has(r.responsibleUserId) ? [r.responsibleUserId] : [];
        const others = Array.from(
          new Set([...(r.meetingCreatorId && active.has(r.meetingCreatorId) ? [r.meetingCreatorId] : []), ...leaderIds])
        ).filter((id) => id !== r.responsibleUserId);
        const common = {
          type: "council.resolution_overdue",
          title: title(r.number, r.text),
          message: overdueReminderMessage(r.number, r.dueDate),
          entityType: "council_resolution",
          entityId: r.id,
        };
        let delivered = false;
        try {
          if (responsible.length) {
            await deliverNotification(db, { ...common, userIds: responsible, link: LINK_MINE });
            delivered = true;
          }
          if (others.length) {
            await deliverNotification(db, { ...common, userIds: others, link: LINK_OVERDUE });
            delivered = true;
          }
        } catch (e) {
          console.error(`council-resolutions: overdue reminder failed (${r.id})`, e);
        }
        if (delivered) {
          sent++;
        } else {
          // Nothing went out: release the claim so a later run can retry ("exactly once").
          await db
            .update(councilResolutions)
            .set({ reminderOverdueSentAt: null })
            .where(eq(councilResolutions.id, r.id))
            .catch(() => undefined);
        }
      }
    }
  } catch (e) {
    console.error("council-resolutions: overdue pass skipped", e);
  }

  return sent;
}
