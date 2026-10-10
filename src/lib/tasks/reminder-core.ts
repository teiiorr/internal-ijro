/**
 * Pure helpers for the daily task-reminder pass (scripts/jobs/task-reminders.ts).
 *
 * No runtime imports on purpose: this file is loaded both by the standalone
 * worker (tsx, outside Next) and by vitest. All dates are plain 'YYYY-MM-DD'
 * strings in Asia/Tashkent (UTC+5, no DST).
 */

export type AssigneeReminderKind = "due_tomorrow" | "due_today" | "overdue_assignee";
export type CreatorEscalationKind = "overdue_creator_d1" | "overdue_creator_d3";
export type ReminderKind = AssigneeReminderKind | CreatorEscalationKind | "digest";

export const REMINDER_KINDS: readonly ReminderKind[] = [
  "due_tomorrow",
  "due_today",
  "overdue_assignee",
  "overdue_creator_d1",
  "overdue_creator_d3",
  "digest",
];

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date (YYYY-MM-DD) of the given instant in Tashkent (UTC+5). */
export function tashkentDateString(d: Date): string {
  return new Date(d.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

function isoToUtcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Shifts a YYYY-MM-DD date by n calendar days (n may be negative). */
export function addDays(iso: string, n: number): string {
  return new Date(isoToUtcMs(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole calendar days from `fromIso` to `toIso` (positive when `toIso` is later). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((isoToUtcMs(toIso) - isoToUtcMs(fromIso)) / DAY_MS);
}

/**
 * Which per-assignee reminder (if any) a deadline warrants today.
 *   deadline = today + 1               → due_tomorrow
 *   deadline = today                   → due_today
 *   today - lookback ≤ deadline < today → overdue_assignee
 *   anything else                      → null
 */
export function classifyAssigneeReminder(
  deadlineIso: string,
  todayIso: string,
  lookbackDays: number
): AssigneeReminderKind | null {
  const diff = daysBetween(todayIso, deadlineIso);
  if (diff === 1) return "due_tomorrow";
  if (diff === 0) return "due_today";
  if (diff < 0 && -diff <= lookbackDays) return "overdue_assignee";
  return null;
}

/**
 * Creator escalation step for a task overdue by `overdueDays` days.
 * Day 1–2 → d1, day 3+ → d3. A first run that finds a 5-day-old task therefore
 * sends only the d3 escalation (the d1 key is never armed for it).
 */
export function creatorEscalationKind(overdueDays: number): CreatorEscalationKind | null {
  if (overdueDays >= 3) return "overdue_creator_d3";
  if (overdueDays >= 1) return "overdue_creator_d1";
  return null;
}

export type DigestCounts = { dueToday: number; overdue: number; awaitingApproval: number };

/** Bilingual morning digest text, or null when there is nothing to report. */
export function digestText(c: DigestCounts): { title: string; message: string } | null {
  const dueToday = Math.max(0, Math.trunc(c.dueToday || 0));
  const overdue = Math.max(0, Math.trunc(c.overdue || 0));
  const awaiting = Math.max(0, Math.trunc(c.awaitingApproval || 0));
  if (dueToday === 0 && overdue === 0 && awaiting === 0) return null;
  return {
    title: "Ertalabki xulosa / Утренняя сводка",
    message:
      `Bugun muddati: ${dueToday}, Kechikkan: ${overdue}, Tasdiqlashingizni kutmoqda: ${awaiting}` +
      ` / Сегодня срок: ${dueToday}, Просрочено: ${overdue}, Ждут вашего утверждения: ${awaiting}`,
  };
}

/** Bilingual per-assignee reminder line. */
export function assigneeReminderMessage(kind: AssigneeReminderKind): string {
  switch (kind) {
    case "due_tomorrow":
      return "Muddat ertaga / Срок завтра";
    case "due_today":
      return "Muddat bugun / Срок сегодня";
    case "overdue_assignee":
      return "Muddat oʻtdi / Срок истёк";
  }
}

/** Bilingual creator-escalation line. */
export function escalationMessage(total: number, late: number): string {
  return `${total} ijrochidan ${late} nafari kechikmoqda / Просрочили ${late} из ${total} исполнителей`;
}

/** Notification title: "<reg no> <title>" (reg no is optional). */
export function taskNotificationTitle(registrationNumber: string | null | undefined, title: string): string {
  // notifications.title varchar(255) — topshiriq nomi 500 belgigacha bo'lishi mumkin.
  const s = `${registrationNumber ?? ""} ${title}`.trim();
  const cps = Array.from(s);
  return cps.length > 255 ? cps.slice(0, 254).join("") + "…" : s;
}

/** Per-task link; kontragent users only have access to the contractor portal. */
export function taskLinkFor(position: string | null | undefined, taskId: string): string {
  return position === "kontragent" ? `/contractor/tasks/${taskId}` : `/tasks/${taskId}`;
}

/** Parses WORKER_TASK_LOOKBACK_DAYS; falls back to 14 for missing/invalid values. */
export function parseLookbackDays(raw: string | undefined | null, fallback = 14): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}
