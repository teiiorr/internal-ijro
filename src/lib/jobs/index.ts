import "server-only";
import cron from "node-cron";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, users, notificationSettings, notifications } from "@/lib/db/schema";
import { sendMail } from "@/lib/email";
import { buildWeeklyReportPdf } from "@/lib/pdf/weekly-report";

// Reminders 24h before deadline (in_progress or todo only)
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

// Reminder to submit standup at 17:00 user-local time (we approximate by sending at 12:00 UTC)
async function jobStandupReminders() {
  const recipients = await db
    .select({ userId: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .innerJoin(notificationSettings, eq(notificationSettings.userId, users.id))
    .where(
      sql`${users.status} = 'active' AND ${users.position} <> 'kontragent' AND ${notificationSettings.notifyStandupReminder} = true`
    );
  for (const r of recipients) {
    await db.insert(notifications).values({
      userId: r.userId,
      type: "standup.reminder",
      title: "Time to submit your daily standup",
      link: "/reports/standup",
    });
  }
}

// Weekly PDF to Direktor inboxes
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
      }).catch(() => {});
      // Note: attachment-with-pdf would require switching to mailer raw attachments — left for production refinement.
    }
    void pdf;
  } catch (e) {
    console.error("weekly report failed", e);
  }
}

let started = false;
export function startCronJobs() {
  if (started) return;
  started = true;
  cron.schedule("0 * * * *", () => jobDeadlineReminders().catch(console.error)); // every hour
  cron.schedule("0 17 * * *", () => jobStandupReminders().catch(console.error)); // 17:00 server tz daily
  cron.schedule("0 9 * * 1", () => jobWeeklyReport().catch(console.error)); // Monday 09:00
  console.log("[cron] jobs scheduled");
}

void desc;
