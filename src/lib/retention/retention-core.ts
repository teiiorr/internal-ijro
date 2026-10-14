/**
 * Pure, DB-free core for the log-retention worker job.
 *
 * The audit flagged three unbounded tables that grow forever. We prune rows
 * older than a fixed window per table. This module only computes WHAT to cut
 * (the cutoff timestamps); the actual chunked DELETEs live in the worker job
 * (scripts/jobs/log-retention.ts). Keeping the date math here makes it testable
 * without a database and with no server-only / "@/" alias dependency.
 */

/**
 * Retention windows, in days. Tunable here; each comment states the intent.
 */
export const RETENTION_DAYS = {
  /** activity_log: full audit trail — keep ~1 year of history. */
  ACTIVITY_LOG: 365,
  /**
   * notifications: only ALREADY-READ notifications older than ~3 months are
   * pruned. Unread notifications are never deleted regardless of age.
   */
  NOTIFICATIONS_READ: 90,
  /**
   * reminder dedupe logs (task_reminder_log): the per-send guard rows. Once the
   * deadline/day they protect is long past they are dead weight — keep ~6 months.
   */
  REMINDER_LOG: 180,
} as const;

/** Milliseconds in one day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The timestamp `days` days before `now`. Rows with a timestamp strictly older
 * than this cutoff are eligible for deletion.
 */
export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/** All three cutoffs for a single run, computed from one `now`. */
export type RetentionCutoffs = {
  activityLog: Date;
  notificationsRead: Date;
  reminderLog: Date;
};

/**
 * Resolve the cutoff timestamp for every retained table in one pass.
 * Pure: same `now` in → same cutoffs out.
 */
export function retentionCutoffs(now: Date = new Date()): RetentionCutoffs {
  return {
    activityLog: retentionCutoff(now, RETENTION_DAYS.ACTIVITY_LOG),
    notificationsRead: retentionCutoff(now, RETENTION_DAYS.NOTIFICATIONS_READ),
    reminderLog: retentionCutoff(now, RETENTION_DAYS.REMINDER_LOG),
  };
}

/** Summary returned by a retention run — deleted-row counts per table. */
export type RetentionResult = {
  activityLog: number;
  notifications: number;
  reminderLog: number;
};

/** Chunk size for the loop of bounded DELETEs (keeps locks/txns short). */
export const RETENTION_CHUNK = 5_000;
