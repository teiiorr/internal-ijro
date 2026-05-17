import "server-only";
import cron from "node-cron";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { addDays, addMonths, addWeeks } from "date-fns";
import { db } from "@/lib/db";
import { tasks, users, notificationSettings, notifications } from "@/lib/db/schema";
import { sendMail } from "@/lib/email";
import { buildWeeklyReportPdf } from "@/lib/pdf/weekly-report";

// ---------- Deadline reminders (24h ahead) ----------
async function jobDeadlineReminders() {
  const rows = await db
    .select({ id: tasks.id, title: tasks.title, assignedToUserId: tasks.assignedToUserId, deadline: tasks.deadline })
    .from(tasks)
    .where(
      and(
        sql`${tasks.status} not in ('completed','rejected')`,
        gt(tasks.deadline, new Date(Date.now() + 23 * 60 * 60 * 1000)),
        lt(tasks.deadline, new Date(Date.now() + 25 * 60 * 60 * 1000))
      )
    );
  for (const t of rows) {
    await db.insert(notifications).values({
      userId: t.assignedToUserId,
      type: "task.deadline_24h",
      title: `Deadline in 24h: ${t.title}`,
      link: `/tasks/${t.id}`,
      relatedEntityType: "task",
      relatedEntityId: t.id,
    });
  }
}

// ---------- Standup reminders by user timezone ----------
/**
 * Runs every hour. For each user whose local time is 17:xx in their timezone,
 * inserts a reminder once per day (idempotent via notifications.type+entityId day key).
 */
async function jobStandupRemindersByTz() {
  const recipients = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      timezone: users.timezone,
    })
    .from(users)
    .innerJoin(notificationSettings, eq(notificationSettings.userId, users.id))
    .where(
      sql`${users.status} = 'active' AND ${users.position} <> 'kontragent' AND ${notificationSettings.notifyStandupReminder} = true`
    );

  const now = new Date();
  for (const r of recipients) {
    let hour: number;
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: r.timezone || "Asia/Tashkent", hour: "numeric", hour12: false }).formatToParts(now);
      hour = Number(parts.find((p) => p.type === "hour")?.value ?? "-1");
    } catch {
      continue;
    }
    if (hour !== 17) continue;

    // Idempotency by day: check we haven't already sent today (use related_entity_id = uuid of date as hash)
    const todayKey = `standup-${new Date().toISOString().slice(0, 10)}-${r.userId}`;
    const dup = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, r.userId), eq(notifications.type, "standup.reminder"), sql`${notifications.createdAt}::date = now()::date`))
      .limit(1);
    if (dup.length > 0) continue;
    await db.insert(notifications).values({
      userId: r.userId,
      type: "standup.reminder",
      title: "Time to submit your daily standup",
      link: "/reports/standup",
    });
    void todayKey;
  }
}

// ---------- Weekly PDF report attached to email ----------
async function jobWeeklyReport() {
  const direktors = await db.select({ email: users.email, fullName: users.fullName }).from(users).where(eq(users.position, "direktor"));
  if (direktors.length === 0) return;
  try {
    const pdf = await buildWeeklyReportPdf();
    for (const d of direktors) {
      await sendMail({
        to: d.email,
        subject: "Weekly company report",
        html: `<p>${d.fullName},</p><p>Please find this week's company report attached.</p>`,
        attachments: [
          { filename: `weekly-${new Date().toISOString().slice(0, 10)}.pdf`, content: pdf, contentType: "application/pdf" },
        ],
      }).catch((e) => console.error("weekly mail failed", e));
    }
  } catch (e) {
    console.error("weekly report failed", e);
  }
}

// ---------- Recurring tasks ----------
/**
 * Walks tasks with is_recurring=true. If the latest instance is completed and its completedAt
 * is before now - <period>, creates a new instance with the same fields but deadline shifted.
 * recurrence_rule supports "daily", "weekly", "monthly".
 */
async function jobRecurringTasks() {
  const recurrents = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.isRecurring, true), sql`${tasks.parentTaskId} is null`));

  for (const t of recurrents) {
    if (!t.recurrenceRule) continue;
    // Find latest instance (template itself counts)
    const latest = await db
      .select()
      .from(tasks)
      .where(sql`(${tasks.id} = ${t.id} OR ${tasks.parentTaskId} = ${t.id})`)
      .orderBy(sql`coalesce(${tasks.completedAt}, ${tasks.createdAt}) desc`)
      .limit(1);
    const last = latest[0] ?? t;
    if (last.status !== "completed") continue;
    const baseDate = last.completedAt ?? new Date();

    let nextDeadline: Date | null = null;
    if (last.deadline) {
      const d = new Date(last.deadline);
      nextDeadline = t.recurrenceRule === "daily" ? addDays(d, 1) : t.recurrenceRule === "weekly" ? addWeeks(d, 1) : t.recurrenceRule === "monthly" ? addMonths(d, 1) : null;
    }

    // Schedule next when the previous deadline is in the past.
    if (nextDeadline && nextDeadline > new Date()) continue;
    if (!nextDeadline) {
      // No deadline → schedule by period from baseDate
      nextDeadline =
        t.recurrenceRule === "daily" ? addDays(baseDate, 1) : t.recurrenceRule === "weekly" ? addWeeks(baseDate, 1) : addMonths(baseDate, 1);
    }

    await db.insert(tasks).values({
      title: t.title,
      description: t.description,
      projectId: t.projectId,
      milestoneId: t.milestoneId,
      parentTaskId: t.id,
      assignedToUserId: t.assignedToUserId,
      createdByUserId: t.createdByUserId,
      priority: t.priority,
      deadline: nextDeadline,
      estimatedHours: t.estimatedHours,
      isRecurring: false,
      recurrenceRule: null,
    });
    await db.insert(notifications).values({
      userId: t.assignedToUserId,
      type: "task.recurring_created",
      title: `Recurring task: ${t.title}`,
      link: `/tasks`,
    });
  }
}

let started = false;
export function startCronJobs() {
  if (started) return;
  started = true;
  cron.schedule("0 * * * *", () => jobDeadlineReminders().catch(console.error)); // hourly
  cron.schedule("0 * * * *", () => jobStandupRemindersByTz().catch(console.error)); // hourly — fires for users where local hour is 17
  cron.schedule("0 9 * * 1", () => jobWeeklyReport().catch(console.error)); // Monday 09:00
  cron.schedule("*/30 * * * *", () => jobRecurringTasks().catch(console.error)); // every 30 minutes
  console.log("[cron] jobs scheduled");
}
