import { and, eq, inArray, lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
// Relative imports on purpose: this file is loaded by the standalone worker
// (scripts/worker.ts), which must not depend on the "@/" alias or server-only.
import * as schema from "../../src/lib/db/schema";
import { taskReminderLog } from "../../src/lib/db/tables/task-reminders";
import {
  RETENTION_CHUNK,
  retentionCutoffs,
  type RetentionResult,
} from "../../src/lib/retention/retention-core";

/**
 * Log retention pass (run from scripts/worker.ts).
 *
 * The audit flagged three tables that grow without bound. This job prunes rows
 * older than a fixed window (see retention-core.ts):
 *
 *   activity_log      : created_at older than ~1 year
 *   notifications     : READ and created_at older than ~3 months (unread kept)
 *   task_reminder_log : created_at older than ~6 months (dead dedupe guards)
 *
 * Deletes are chunked (bounded LIMIT per statement) so a large backlog never
 * takes a long lock or a giant transaction, and idempotent — re-running simply
 * finds fewer (or zero) matching rows. Each table is guarded independently: a
 * missing table (e.g. task_reminder_log before migration 0031) or any single
 * failure is logged and skipped without aborting the others.
 *
 * Relative imports only (no `server-only`, no "@/" alias).
 */

type Db = PostgresJsDatabase<typeof schema>;

const { activityLog, notifications } = schema;

/**
 * Run `fetchIds` / `deleteIds` in bounded chunks until the eligible set drains.
 * Returns the total number of rows deleted. Idempotent: safe to re-run.
 */
async function pruneChunked(
  fetchIds: (limit: number) => Promise<string[]>,
  deleteIds: (ids: string[]) => Promise<void>,
  chunk = RETENTION_CHUNK
): Promise<number> {
  let total = 0;
  for (;;) {
    const ids = await fetchIds(chunk);
    if (ids.length === 0) break;
    await deleteIds(ids);
    total += ids.length;
    // A short page means we drained the eligible set — stop looping.
    if (ids.length < chunk) break;
  }
  return total;
}

/** Prune the retention-managed tables once. Never throws; returns per-table counts. */
export async function runLogRetention(db: Db, now = new Date()): Promise<RetentionResult> {
  const cutoffs = retentionCutoffs(now);
  const result: RetentionResult = { activityLog: 0, notifications: 0, reminderLog: 0 };

  // activity_log: anything older than the audit-trail window.
  try {
    result.activityLog = await pruneChunked(
      (limit) =>
        db
          .select({ id: activityLog.id })
          .from(activityLog)
          .where(lt(activityLog.createdAt, cutoffs.activityLog))
          .limit(limit)
          .then((rows) => rows.map((r) => r.id)),
      (ids) => db.delete(activityLog).where(inArray(activityLog.id, ids)).then(() => undefined)
    );
  } catch (e) {
    console.error("log-retention: activity_log prune failed", e);
  }

  // notifications: only READ ones past the window; unread are untouched.
  try {
    result.notifications = await pruneChunked(
      (limit) =>
        db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(eq(notifications.isRead, true), lt(notifications.createdAt, cutoffs.notificationsRead))
          )
          .limit(limit)
          .then((rows) => rows.map((r) => r.id)),
      (ids) => db.delete(notifications).where(inArray(notifications.id, ids)).then(() => undefined)
    );
  } catch (e) {
    console.error("log-retention: notifications prune failed", e);
  }

  // task_reminder_log: dead dedupe guards (table may not exist before 0031).
  try {
    result.reminderLog = await pruneChunked(
      (limit) =>
        db
          .select({ id: taskReminderLog.id })
          .from(taskReminderLog)
          .where(lt(taskReminderLog.createdAt, cutoffs.reminderLog))
          .limit(limit)
          .then((rows) => rows.map((r) => r.id)),
      (ids) => db.delete(taskReminderLog).where(inArray(taskReminderLog.id, ids)).then(() => undefined)
    );
  } catch (e) {
    console.error("log-retention: task_reminder_log prune skipped", e);
  }

  return result;
}
