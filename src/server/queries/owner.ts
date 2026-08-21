import "server-only";
import os from "node:os";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { sql, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users, projects, tasks, projectStages, stageDocuments, stagePayments,
  externalCompanies, notifications, activityLog, departments,
} from "@/lib/db/schema";
import pkg from "../../../package.json";

const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);

// ---------- 1. System statistics ----------
export async function getSystemStats() {
  const cnt = () => sql<number>`count(*)::int`;
  const [
    usersTotal, usersActive, projectsTotal, projectsActive, tasksTotal,
    stagesTotal, docsTotal, companiesTotal, notifsTotal, logsTotal, deptTotal,
  ] = await Promise.all([
    one(db.select({ n: cnt() }).from(users)),
    one(db.select({ n: cnt() }).from(users).where(sql`${users.status} = 'active'`)),
    one(db.select({ n: cnt() }).from(projects)),
    one(db.select({ n: cnt() }).from(projects).where(sql`${projects.status} not in ('completed','cancelled')`)),
    one(db.select({ n: cnt() }).from(tasks)),
    one(db.select({ n: cnt() }).from(projectStages)),
    one(db.select({ n: cnt() }).from(stageDocuments)),
    one(db.select({ n: cnt() }).from(externalCompanies)),
    one(db.select({ n: cnt() }).from(notifications)),
    one(db.select({ n: cnt() }).from(activityLog)),
    one(db.select({ n: cnt() }).from(departments)),
  ]);

  // Scope money sums to UZS so the "UZS" label is accurate (payments may carry
  // a non-UZS currency; mixing them into one figure would mislabel the total).
  const pay = await db
    .select({
      paid: sql<string>`coalesce(sum(case when ${stagePayments.status} = 'paid' and ${stagePayments.currency} = 'UZS' then ${stagePayments.amount} else 0 end), 0)`,
      pending: sql<string>`coalesce(sum(case when ${stagePayments.status} <> 'paid' and ${stagePayments.currency} = 'UZS' then ${stagePayments.amount} else 0 end), 0)`,
    })
    .from(stagePayments);

  const sizeRows = (await db.execute<{ size: string }>(
    sql`select pg_size_pretty(pg_database_size(current_database())) as size`
  )) as unknown as { size: string }[];

  return {
    users: usersTotal,
    activeUsers: usersActive,
    projects: projectsTotal,
    activeProjects: projectsActive,
    tasks: tasksTotal,
    stages: stagesTotal,
    documents: docsTotal,
    companies: companiesTotal,
    notifications: notifsTotal,
    logs: logsTotal,
    departments: deptTotal,
    paid: Number(pay[0]?.paid ?? 0),
    pending: Number(pay[0]?.pending ?? 0),
    dbSize: sizeRows[0]?.size ?? "—",
  };
}

// ---------- 2. Recent changes (who added / deleted / changed what) ----------
// Actions are "entity.verb" OR "entity.noun_verb" — so the meaningful verb is the
// LAST token when split on "." or "_" (e.g. stage.payment_added → "added").
const ADD_VERBS = new Set(["created", "added", "uploaded", "invited", "submitted", "assigned", "set"]);
const DEL_VERBS = new Set(["deleted", "removed", "archived", "unassigned"]);

/** Classify an action string into add / delete / update for the changes feed. */
export function changeKind(action: string): "add" | "delete" | "update" {
  const verb = action.split(/[._]/).pop() ?? "";
  if (ADD_VERBS.has(verb)) return "add";
  if (DEL_VERBS.has(verb)) return "delete";
  return "update";
}

export async function getRecentChanges(limit = 40) {
  // Match the trailing verb regardless of the "." / "_" separator so compound
  // actions (payment_added, document_removed, poster_set, …) are included.
  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      createdAt: activityLog.createdAt,
      userName: users.fullName,
      userAvatarUrl: users.avatarUrl,
    })
    .from(activityLog)
    .leftJoin(users, eq(users.id, activityLog.userId))
    .where(sql`${activityLog.action} ~ '(created|added|uploaded|invited|submitted|assigned|set|deleted|removed|archived|unassigned|updated|changed|reordered|recategorized|completed)$'`)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
  return rows;
}

// ---------- 3. Dev tools / system info ----------
const SAFE_ENV = [
  "NODE_ENV", "APP_NAME", "APP_URL", "AUTH_URL", "PORT", "HOSTNAME",
  "AUTH_TRUST_HOST", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_FROM",
  "UPLOAD_DIR", "MAX_UPLOAD_BYTES", "WORKER_APPROACHING_DAYS", "WORKER_STALE_DAYS",
];
// Only ever surface a configured yes/no for these — NEVER their value.
const SECRET_ENV = ["DATABASE_URL", "AUTH_SECRET", "SMTP_USER", "SMTP_PASS", "TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"];

const BACKUP_DIR = process.env.BACKUP_DIR ?? "/opt/markaz-ijro/backup/dumps";

export async function getSystemInfo() {
  const mem = process.memoryUsage();
  const runtime = {
    node: process.version,
    appVersion: (pkg as { version?: string }).version ?? "—",
    nodeEnv: process.env.NODE_ENV ?? "—",
    uptimeSec: Math.round(process.uptime()),
    platform: `${process.platform}/${process.arch}`,
    rssMb: Math.round(mem.rss / 1048576),
    heapMb: Math.round(mem.heapUsed / 1048576),
    cpus: os.cpus().length,
    loadavg: os.loadavg().map((x) => x.toFixed(2)).join("  "),
    totalMemMb: Math.round(os.totalmem() / 1048576),
    freeMemMb: Math.round(os.freemem() / 1048576),
  };

  const env = {
    safe: SAFE_ENV.map((k) => ({ k, v: process.env[k] ?? "—" })).filter((e) => e.v !== "—" || e.k === "NODE_ENV"),
    secret: SECRET_ENV.map((k) => ({ k, set: !!process.env[k] })),
  };

  let backup:
    | { ok: true; count: number; latest: { name: string; sizeMb: number; mtime: Date } | null; totalMb: number }
    | { ok: false } = { ok: false };
  try {
    const names = (await readdir(BACKUP_DIR)).filter((n) => n.endsWith(".sql.gz") || n.endsWith(".dump"));
    const rows = await Promise.all(
      names.map(async (name) => {
        const s = await stat(join(BACKUP_DIR, name));
        return { name, size: s.size, mtime: s.mtime };
      })
    );
    rows.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const top = rows[0];
    backup = {
      ok: true,
      count: rows.length,
      totalMb: Math.round(rows.reduce((a, r) => a + r.size, 0) / 1048576),
      latest: top ? { name: top.name, sizeMb: Math.round((top.size / 1048576) * 100) / 100, mtime: top.mtime } : null,
    };
  } catch {
    backup = { ok: false };
  }

  const tables = (await db.execute<{ name: string; size: string }>(
    sql`select relname as name, pg_size_pretty(pg_total_relation_size(relid)) as size
        from pg_catalog.pg_statio_user_tables
        order by pg_total_relation_size(relid) desc limit 10`
  )) as unknown as { name: string; size: string }[];

  const connRows = (await db.execute<{ c: number }>(
    sql`select count(*)::int as c from pg_stat_activity where datname = current_database()`
  )) as unknown as { c: number }[];

  return { runtime, env, backup, tables, connections: Number(connRows[0]?.c ?? 0) };
}
