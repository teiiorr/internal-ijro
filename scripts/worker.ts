import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, isNull, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { deliverNotification } from "@/lib/notifications/deliver";

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
  }

  console.log(`worker: ${sent} reminder(s) sent (approaching=${approaching.length}, overdue=${overdue.length}, stale=${stale.length}).`);
  await sql_client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
