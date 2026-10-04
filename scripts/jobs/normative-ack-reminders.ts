import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../src/lib/db/schema";
import { normativeAckRequests, normativeAcknowledgements } from "../../src/lib/db/tables/normative-ack";
import { deliverNotification } from "../../src/lib/notifications/deliver";

/**
 * Daily normative-document acknowledgement reminders (run once from scripts/worker.ts at 08:00 Tashkent).
 *
 *   (a) deadline = today + 1 and reminder_due_sent_at IS NULL
 *         → every active recipient who has not acknowledged yet ("due tomorrow")
 *   (b) deadline < today     and reminder_overdue_sent_at IS NULL
 *         → the pending recipients ("overdue") + a summary to the requester
 *
 * Each reminder_*_sent_at column is claimed with a conditional UPDATE before sending, so a
 * second run on the same day sends nothing ("exactly once per request"); a failed delivery
 * releases the claim. Before migration 0031 the tables are missing and the pass logs and
 * returns 0. Relative imports only (no `server-only`, no "@/" alias).
 */

type Db = PostgresJsDatabase<typeof schema>;

const { normativeDocuments, users } = schema;
const r = normativeAckRequests;
const a = normativeAcknowledgements;

const DUE_MESSAGE = "Ertaga tanishish muddati tugaydi / Завтра истекает срок ознакомления";
const OVERDUE_MESSAGE = "Tanishish muddati oʻtdi / Срок ознакомления истёк";

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const tashkentToday = (now: Date) => new Date(now.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
const addDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const ackLink = (requestId: string) => `/meyoriy-hujjatlar?ack=${requestId}`;

/** Active recipients of a request who have not acknowledged yet, plus the request's total recipient count. */
async function recipientsOf(db: Db, requestId: string): Promise<{ pending: string[]; total: number }> {
  const rows = await db
    .select({ userId: a.userId, acknowledgedAt: a.acknowledgedAt, status: users.status })
    .from(a)
    .innerJoin(users, eq(users.id, a.userId))
    .where(eq(a.requestId, requestId));
  return {
    total: rows.length,
    pending: rows.filter((x) => x.acknowledgedAt === null && x.status === "active").map((x) => x.userId),
  };
}

export async function runNormativeAckReminders(db: Db, now = new Date()): Promise<number> {
  try {
    const today = tashkentToday(now);
    const tomorrow = addDays(today, 1);
    let sent = 0;

    // ---------- (a) due tomorrow ----------
    const due = await db
      .select({ id: r.id, fileName: normativeDocuments.fileName })
      .from(r)
      .innerJoin(normativeDocuments, eq(normativeDocuments.id, r.documentId))
      .where(and(eq(r.deadline, tomorrow), isNull(r.reminderDueSentAt)));

    for (const q of due) {
      const claimed = await db
        .update(r)
        .set({ reminderDueSentAt: now })
        .where(and(eq(r.id, q.id), isNull(r.reminderDueSentAt)))
        .returning({ id: r.id });
      if (claimed.length === 0) continue;
      try {
        const { pending } = await recipientsOf(db, q.id);
        if (pending.length === 0) continue; // everyone already acknowledged — claim stays (nothing to send)
        await deliverNotification(db, {
          userIds: pending,
          type: "normative.ack_due",
          title: `Tanishib chiqing: ${q.fileName}`,
          message: DUE_MESSAGE,
          link: ackLink(q.id),
          entityType: "normative_ack_request",
          entityId: q.id,
        });
        sent++;
      } catch (e) {
        console.error(`normative-ack: due reminder failed (${q.id})`, e);
        await db
          .update(r)
          .set({ reminderDueSentAt: null })
          .where(eq(r.id, q.id))
          .catch(() => undefined);
      }
    }

    // ---------- (b) overdue ----------
    const overdue = await db
      .select({
        id: r.id,
        documentId: r.documentId,
        requestedByUserId: r.requestedByUserId,
        fileName: normativeDocuments.fileName,
      })
      .from(r)
      .innerJoin(normativeDocuments, eq(normativeDocuments.id, r.documentId))
      .where(and(lt(r.deadline, today), isNull(r.reminderOverdueSentAt)));

    if (overdue.length > 0) {
      // Requesters must still be active internal employees to get the summary.
      const requesterIds = Array.from(
        new Set(overdue.map((q) => q.requestedByUserId).filter((x): x is string => !!x))
      );
      const activeRows = requesterIds.length
        ? await db
            .select({ id: users.id })
            .from(users)
            .where(and(inArray(users.id, requesterIds), eq(users.status, "active"), sql`${users.position} <> 'kontragent'`))
        : [];
      const activeRequesters = new Set(activeRows.map((u) => u.id));

      for (const q of overdue) {
        const claimed = await db
          .update(r)
          .set({ reminderOverdueSentAt: now })
          .where(and(eq(r.id, q.id), isNull(r.reminderOverdueSentAt)))
          .returning({ id: r.id });
        if (claimed.length === 0) continue;

        let delivered = false;
        let failed = false;
        try {
          const { pending, total } = await recipientsOf(db, q.id);
          if (pending.length > 0) {
            await deliverNotification(db, {
              userIds: pending,
              type: "normative.ack_overdue",
              title: `Tanishib chiqing: ${q.fileName}`,
              message: OVERDUE_MESSAGE,
              link: ackLink(q.id),
              entityType: "normative_ack_request",
              entityId: q.id,
            });
            delivered = true;
            if (q.requestedByUserId && activeRequesters.has(q.requestedByUserId)) {
              await deliverNotification(db, {
                userIds: [q.requestedByUserId],
                type: "normative.ack_overdue_summary",
                title: `Tanishtirish muddati oʻtdi: ${q.fileName}`,
                message: `${pending.length}/${total} xodim tanishmagan / не ознакомились: ${pending.length} из ${total}`,
                link: `/meyoriy-hujjatlar#doc-${q.documentId}`,
                entityType: "normative_ack_request",
                entityId: q.id,
              });
            }
          }
        } catch (e) {
          failed = true;
          console.error(`normative-ack: overdue reminder failed (${q.id})`, e);
        }
        if (delivered) {
          sent++;
        } else if (failed) {
          // Nothing went out: release the claim so a later run can retry ("exactly once").
          await db
            .update(r)
            .set({ reminderOverdueSentAt: null })
            .where(eq(r.id, q.id))
            .catch(() => undefined);
        }
      }
    }

    return sent;
  } catch (e) {
    console.error("normative-ack: reminders skipped", e);
    return 0;
  }
}
