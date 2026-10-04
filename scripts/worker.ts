import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, isNull, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { deliverNotification } from "@/lib/notifications/deliver";
import { runTaskReminders } from "./jobs/task-reminders";
import { runCouncilResolutionReminders } from "./jobs/council-resolutions";
import { runNormativeAckReminders } from "./jobs/normative-ack-reminders";
import { runWeeklySnapshot } from "./jobs/weekly-snapshot";

const { projectStages, projects, users } = schema;

/**
 * Background deadline checker for project stages.
 *
 * Single pass, then exit — intended to run on a schedule (systemd timer in prod,
 * `pnpm worker` in dev). For each ACTIVE stage it fires at most one reminder of
 * each kind; the per-stage `reminder_*_sent_at` columns are the dedupe guard and
 * are cleared whenever a stage transitions (see completeStage/reopenStage), so a
 * future active stage can alert afresh.
 *
 *   Approaching : planned_deadline within N days     → responsible + curator
 *   Overdue     : planned_deadline already passed     → responsible + curator + directors
 *   Stale       : active with no activity for M days  → responsible + curator
 *
 * Boots its own DB pool (like scripts/seed.ts) and uses the server-only-free
 * delivery core so it doesn't drag in Next-only modules.
 */

const APPROACHING_DAYS = Number(process.env.WORKER_APPROACHING_DAYS ?? 3);
const STALE_DAYS = Number(process.env.WORKER_STALE_DAYS ?? 7);

const link = (projectId: string, stageId: string) => `/projects/${projectId}/stages/${stageId}`;
const clean = (ids: (string | null | undefined)[]) => ids.filter((x): x is string => !!x);

const baseSelect = {
  id: projectStages.id,
  name: projectStages.name,
  projectId: projectStages.projectId,
  projectName: projects.name,
  responsibleUserId: projectStages.responsibleUserId,
  curatorUserId: projects.curatorUserId,
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql_client = postgres(url, { max: 1 });
  const db = drizzle(sql_client, { schema });

  const directorIds = async (): Promise<string[]> => {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.status}='active' AND ${users.position} in ('direktor','orinbosar')`);
    return rows.map((r) => r.id);
  };

  // Bosqich muddati eslatmalari (yaqinlashmoqda / kechikdi / harakatsiz).
  const runStageReminders = async () => {
    let sent = 0;

    // 1) Approaching
    const approaching = await db
      .select(baseSelect)
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .where(
        and(
          eq(projectStages.status, "active"),
          isNull(projectStages.reminderApproachingSentAt),
          sql`${projectStages.plannedDeadline} is not null`,
          sql`${projectStages.plannedDeadline} >= now()::date`,
          sql`${projectStages.plannedDeadline} <= now()::date + ${APPROACHING_DAYS} * interval '1 day'`
        )
      );
    for (const s of approaching) {
      try {
        await deliverNotification(db, {
          userIds: clean([s.responsibleUserId, s.curatorUserId]),
          type: "stage.deadline_approaching",
          title: `${s.projectName}: ${s.name}`,
          message: "Bosqich muddati yaqinlashmoqda / Приближается срок этапа",
          link: link(s.projectId, s.id),
          entityType: "project_stage",
          entityId: s.id,
        });
        await db.update(projectStages).set({ reminderApproachingSentAt: new Date() }).where(eq(projectStages.id, s.id));
        sent++;
      } catch (e) {
        // Bitta muammoli bosqich qolganlarini to'xtatmasin; belgi qo'yilmagani uchun ertaga qayta uriniladi.
        console.error(`worker: stage ${s.id} reminder failed`, e);
      }
    }

    // 2) Overdue
    const overdue = await db
      .select(baseSelect)
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .where(
        and(
          eq(projectStages.status, "active"),
          isNull(projectStages.reminderOverdueSentAt),
          sql`${projectStages.plannedDeadline} is not null`,
          sql`${projectStages.plannedDeadline} < now()::date`
        )
      );
    const directors = overdue.length > 0 ? await directorIds() : [];
    for (const s of overdue) {
      try {
        await deliverNotification(db, {
          userIds: clean([s.responsibleUserId, s.curatorUserId, ...directors]),
          type: "stage.overdue",
          title: `${s.projectName}: ${s.name}`,
          message: "Bosqich muddati o'tib ketdi / Срок этапа просрочен",
          link: link(s.projectId, s.id),
          entityType: "project_stage",
          entityId: s.id,
        });
        await db.update(projectStages).set({ reminderOverdueSentAt: new Date() }).where(eq(projectStages.id, s.id));
        sent++;
      } catch (e) {
        // Bitta muammoli bosqich qolganlarini to'xtatmasin; belgi qo'yilmagani uchun ertaga qayta uriniladi.
        console.error(`worker: stage ${s.id} reminder failed`, e);
      }
    }

    // 3) Stale (active with no activity for M days)
    const stale = await db
      .select(baseSelect)
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .where(
        and(
          eq(projectStages.status, "active"),
          isNull(projectStages.reminderStaleSentAt),
          sql`coalesce(${projectStages.startedAt}, ${projectStages.createdAt}) < now() - ${STALE_DAYS} * interval '1 day'`
        )
      );
    for (const s of stale) {
      try {
        await deliverNotification(db, {
          userIds: clean([s.responsibleUserId, s.curatorUserId]),
          type: "stage.stale",
          title: `${s.projectName}: ${s.name}`,
          message: "Bosqichda uzoq vaqt harakat yo'q / По этапу давно нет активности",
          link: link(s.projectId, s.id),
          entityType: "project_stage",
          entityId: s.id,
        });
        await db.update(projectStages).set({ reminderStaleSentAt: new Date() }).where(eq(projectStages.id, s.id));
        sent++;
      } catch (e) {
        // Bitta muammoli bosqich qolganlarini to'xtatmasin; belgi qo'yilmagani uchun ertaga qayta uriniladi.
        console.error(`worker: stage ${s.id} reminder failed`, e);
      }
    }

    return { sent, approaching: approaching.length, overdue: overdue.length, stale: stale.length };
  };

  // Kunlik ishlar — har biri alohida: bittasi yiqilsa, qolganlari baribir bajariladi.
  const jobs: [string, () => Promise<unknown>][] = [
    ["stage-reminders", runStageReminders],
    ["task-reminders", () => runTaskReminders(db)],
    ["council-resolutions", () => runCouncilResolutionReminders(db)],
    ["normative-ack", () => runNormativeAckReminders(db)],
    ["weekly-snapshot", () => runWeeklySnapshot(db)],
  ];
  for (const [name, run] of jobs) {
    try {
      console.log(`worker: ${name} →`, JSON.stringify(await run()));
    } catch (e) {
      console.error(`worker: ${name} failed`, e);
    }
  }

  await sql_client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
