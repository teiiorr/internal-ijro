import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../src/lib/db/schema";
import { weeklySnapshots } from "../../src/lib/db/tables/weekly-brief";
import { deliverNotification } from "../../src/lib/notifications/deliver";
import { OWNER_EMAILS } from "../../src/lib/permissions/owner";
import { ensureSnapshot } from "../../src/lib/reports/weekly-snapshot";
import {
  lastCompletedWeekStart,
  tashkentIsoWeekday,
  weekOptionLabel,
  WEEKLY_BRIEF_VIEWER_POSITIONS,
} from "../../src/lib/reports/weekly-brief-core";

/**
 * Weekly management brief (run from scripts/worker.ts at 08:00 Tashkent, every day).
 *
 * Does something only on a Tashkent MONDAY:
 *   1) ensureSnapshot(previous week) — INSERT … ON CONFLICT (week_start) DO NOTHING, so a
 *      second run on the same Monday inserts nothing;
 *   2) if notified_at IS NULL, claims it with a conditional UPDATE and notifies active,
 *      non-hidden direktor / orinbosar / koordinator / bolim_boshligi once. A failed
 *      delivery releases the claim so the next run can retry.
 *
 * Before migration 0031 the table is missing: the pass logs and returns false.
 * Relative imports only (no `server-only`, no "@/" alias).
 */

type Db = PostgresJsDatabase<typeof schema>;

const { users } = schema;

/** Returns true when Monday's snapshot pass completed; false on other days or on error. */
export async function runWeeklySnapshot(db: Db, now = new Date()): Promise<boolean> {
  if (tashkentIsoWeekday(now) !== 1) return false;
  try {
    const ws = lastCompletedWeekStart(now);
    await ensureSnapshot(db, ws, now);

    const claimed = await db
      .update(weeklySnapshots)
      .set({ notifiedAt: now })
      .where(and(eq(weeklySnapshots.weekStart, ws), isNull(weeklySnapshots.notifiedAt)))
      .returning({ id: weeklySnapshots.id });
    if (claimed.length === 0) return true; // already notified for this week

    const recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.status, "active"),
          eq(users.hidden, false),
          or(inArray(users.position, [...WEEKLY_BRIEF_VIEWER_POSITIONS]), inArray(sql`lower(${users.email})`, OWNER_EMAILS))
        )
      );

    try {
      await deliverNotification(db, {
        userIds: recipients.map((r) => r.id),
        type: "report.weekly",
        title: "Haftalik brifing tayyor / Еженедельный брифинг готов",
        message: weekOptionLabel(ws),
        link: `/reports/weekly?week=${ws}`,
        entityType: "weekly_snapshot",
        entityId: claimed[0].id,
      });
    } catch (e) {
      console.error(`weekly-snapshot: delivery failed (${ws})`, e);
      await db
        .update(weeklySnapshots)
        .set({ notifiedAt: null })
        .where(eq(weeklySnapshots.id, claimed[0].id))
        .catch(() => undefined);
      return false;
    }
    return true;
  } catch (e) {
    console.error("weekly-snapshot: pass skipped", e);
    return false;
  }
}
