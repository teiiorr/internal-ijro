import "server-only";
import { and, asc, eq, gt, gte, inArray, isNull, or, sql, type AnyColumn } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import {
  councilAgendaItems,
  councilMeetings,
  projectCurators,
  projectStages,
  projects,
  stageRequests,
  stageTemplateItems,
  taskAssignees,
  tasks,
  users,
} from "@/lib/db/schema";
import { personalTodos } from "@/lib/db/tables/my-work";
import { BUCKET_ORDER, bucketOf, todayTashkent, weekDays, type Bucket } from "@/lib/my-work/buckets";
import { timeAgo } from "@/lib/dates";

// "Mening ishlarim" — joriy foydalanuvchining barcha modullardagi majburiyatlari bitta
// roʻyxatda. Har bir manba alohida try/catch bilan oʻralgan: bitta jadval (masalan,
// hali qoʻllanmagan 0031 dagi personal_todos) yoʻq boʻlsa ham sahifa ishlayveradi.

export type AgendaKind = "task" | "approval" | "stage" | "review" | "studio_request" | "council" | "todo";

export const AGENDA_KINDS: AgendaKind[] = ["task", "approval", "stage", "review", "studio_request", "council", "todo"];

export type AgendaItem = {
  key: string;
  kind: AgendaKind;
  id: string;
  title: string;
  sub: string | null;
  href: string | null;
  /** Toshkent kalendar kuni "YYYY-MM-DD" yoki null. */
  date: string | null;
  bucket: Bucket;
  done?: boolean;
  /** Teskari sanoq uchun aniq vaqt (ISO). Faqat haqiqiy vaqtga ega manbalarda (kengash). */
  at?: string | null;
  todo?: { note: string | null; linkedTaskId: string | null; linkedProjectId: string | null; orderIndex: number };
};

type T = (key: string) => string;

const TASHKENT_DATE = (col: AnyColumn) => sql<string | null>`to_char((${col} AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD')`;

/** Boʻlimlar ichidagi tartib: avval harakat talab qiladiganlar. */
const KIND_RANK: Record<AgendaKind, number> = {
  approval: 0,
  review: 1,
  studio_request: 2,
  council: 3,
  stage: 4,
  task: 5,
  todo: 6,
};

/** Bogʻlangan shablon elementidan lokallashtirilgan bosqich nomi (stages.ts dagi yopiq mantiqning nusxasi). */
function stageName(row: { tiUz: string | null; tiCy: string | null; tiRu: string | null; snapshot: string }, locale: string): string {
  const loc = locale === "ru" ? row.tiRu : locale === "uz-cyrl" ? row.tiCy : row.tiUz;
  return loc ?? row.snapshot;
}

function joinSub(...parts: (string | null | undefined)[]): string | null {
  const s = parts.filter((p): p is string => !!p && p.trim().length > 0).join(", ");
  return s || null;
}

function clip(s: string, n: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
}

/** Men kurator boʻlgan loyihalar: projects.curator_user_id ∪ project_curators. */
async function curatedProjectIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();
  try {
    const rows = await db.select({ id: projects.id }).from(projects).where(eq(projects.curatorUserId, userId));
    for (const r of rows) ids.add(r.id);
  } catch { /* e'tiborsiz */ }
  try {
    const rows = await db.select({ id: projectCurators.projectId }).from(projectCurators).where(eq(projectCurators.userId, userId));
    for (const r of rows) ids.add(r.id);
  } catch { /* project_curators hali yoʻq */ }
  return [...ids];
}

// ---------------- manbalar ----------------

async function srcTasks(userId: string, today: string): Promise<AgendaItem[]> {
  try {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        reg: tasks.registrationNumber,
        date: TASHKENT_DATE(tasks.deadline),
        creatorName: users.fullName,
      })
      .from(taskAssignees)
      .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
      .leftJoin(users, eq(users.id, tasks.createdByUserId))
      .where(and(eq(taskAssignees.userId, userId), inArray(taskAssignees.status, ["todo", "in_progress", "rejected"])))
      .orderBy(sql`${tasks.deadline} asc nulls last`)
      .limit(200);
    return rows.map((r) => ({
      key: `task:${r.id}`,
      kind: "task" as const,
      id: r.id,
      title: r.title,
      sub: joinSub(r.reg ? `№ ${r.reg}` : null, r.creatorName),
      href: `/tasks/${r.id}`,
      date: r.date,
      bucket: bucketOf(r.date, today),
    }));
  } catch {
    return [];
  }
}

async function srcApprovals(userId: string, today: string): Promise<AgendaItem[]> {
  try {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        responderId: taskAssignees.userId,
        responderName: users.fullName,
      })
      .from(tasks)
      .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
      .leftJoin(users, eq(users.id, taskAssignees.userId))
      .where(and(eq(tasks.createdByUserId, userId), eq(taskAssignees.status, "under_review")))
      .orderBy(sql`${taskAssignees.responseSubmittedAt} desc nulls last`)
      .limit(100);
    return rows.map((r) => ({
      key: `approval:${r.id}:${r.responderId}`,
      kind: "approval" as const,
      id: r.id,
      title: r.title,
      sub: r.responderName ?? null,
      href: `/tasks/${r.id}`,
      // Tasdiqlash har doim "bugun"ning ishi.
      date: today,
      bucket: "today" as const,
    }));
  } catch {
    return [];
  }
}

async function srcStages(userId: string, today: string, locale: string): Promise<AgendaItem[]> {
  try {
    const rows = await db
      .select({
        id: projectStages.id,
        projectId: projectStages.projectId,
        projectName: projects.name,
        snapshot: projectStages.name,
        tiUz: stageTemplateItems.nameUzLatn,
        tiCy: stageTemplateItems.nameUzCyrl,
        tiRu: stageTemplateItems.nameRu,
        date: projectStages.plannedDeadline,
      })
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(and(eq(projectStages.status, "active"), eq(projectStages.responsibleUserId, userId)))
      .orderBy(sql`${projectStages.plannedDeadline} asc nulls last`)
      .limit(100);
    return rows.map((r) => ({
      key: `stage:${r.id}`,
      kind: "stage" as const,
      id: r.id,
      title: stageName(r, locale),
      sub: r.projectName,
      href: `/projects/${r.projectId}/stages/${r.id}`,
      date: r.date ? String(r.date).slice(0, 10) : null,
      bucket: bucketOf(r.date ? String(r.date) : null, today),
    }));
  } catch {
    return [];
  }
}

async function srcReviews(curated: string[], today: string, locale: string, t: T): Promise<AgendaItem[]> {
  if (curated.length === 0) return [];
  try {
    const rows = await db
      .select({
        id: projectStages.id,
        projectId: projectStages.projectId,
        projectName: projects.name,
        snapshot: projectStages.name,
        tiUz: stageTemplateItems.nameUzLatn,
        tiCy: stageTemplateItems.nameUzCyrl,
        tiRu: stageTemplateItems.nameRu,
        submittedAt: projectStages.submittedAt,
      })
      .from(projectStages)
      .innerJoin(projects, eq(projects.id, projectStages.projectId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(
        and(
          eq(projectStages.status, "active"),
          eq(projectStages.reviewStatus, "submitted"),
          inArray(projectStages.projectId, curated),
        ),
      )
      .orderBy(sql`${projectStages.submittedAt} asc nulls last`)
      .limit(100);
    return rows.map((r) => ({
      key: `review:${r.id}`,
      kind: "review" as const,
      id: r.id,
      title: stageName(r, locale),
      sub: joinSub(
        r.projectName,
        t("staffX.myWork.sub.studioSubmitted"),
        r.submittedAt ? timeAgo(r.submittedAt, locale) : null,
      ),
      href: `/projects/${r.projectId}/stages/${r.id}`,
      date: today,
      bucket: "today" as const,
    }));
  } catch {
    return [];
  }
}

async function srcStudioRequests(curated: string[], today: string, locale: string, t: T): Promise<AgendaItem[]> {
  if (curated.length === 0) return [];
  try {
    const rows = await db
      .select({
        id: stageRequests.id,
        type: stageRequests.type,
        message: stageRequests.message,
        createdAt: stageRequests.createdAt,
        projectId: stageRequests.projectId,
        stageId: stageRequests.stageId,
        projectName: projects.name,
        snapshot: projectStages.name,
        tiUz: stageTemplateItems.nameUzLatn,
        tiCy: stageTemplateItems.nameUzCyrl,
        tiRu: stageTemplateItems.nameRu,
      })
      .from(stageRequests)
      .innerJoin(projects, eq(projects.id, stageRequests.projectId))
      .innerJoin(projectStages, eq(projectStages.id, stageRequests.stageId))
      .leftJoin(stageTemplateItems, eq(stageTemplateItems.id, projectStages.templateItemId))
      .where(and(eq(stageRequests.status, "pending"), inArray(stageRequests.projectId, curated)))
      .orderBy(asc(stageRequests.createdAt))
      .limit(100);
    return rows.map((r) => {
      const typeLabel =
        r.type === "deadline" ? t("studio.requests.types.deadline") : r.type === "blocker" ? t("studio.requests.types.blocker") : r.type;
      return {
        key: `studio_request:${r.id}`,
        kind: "studio_request" as const,
        id: r.id,
        title: `${typeLabel}: ${stageName(r, locale)}`,
        sub: joinSub(r.projectName, clip(r.message, 90), timeAgo(r.createdAt, locale)),
        href: `/projects/${r.projectId}/stages/${r.stageId}`,
        date: today,
        bucket: "today" as const,
      };
    });
  } catch {
    return [];
  }
}

async function srcCouncils(userId: string, curated: string[], today: string, locale: string, t: T): Promise<AgendaItem[]> {
  try {
    const involved = curated.length
      ? or(eq(councilAgendaItems.presenterUserId, userId), inArray(councilAgendaItems.projectId, curated))
      : eq(councilAgendaItems.presenterUserId, userId);
    const rows = await db
      .select({
        meetingId: councilMeetings.id,
        kind: councilMeetings.kind,
        title: councilMeetings.title,
        scheduledAt: councilMeetings.scheduledAt,
        date: TASHKENT_DATE(councilMeetings.scheduledAt),
        topic: councilAgendaItems.topic,
      })
      .from(councilAgendaItems)
      .innerJoin(councilMeetings, eq(councilMeetings.id, councilAgendaItems.meetingId))
      // Bugungi majlislar kun davomida koʻrinib tursin: Toshkent kunining boshidan.
      .where(
        and(
          gte(councilMeetings.scheduledAt, sql`(date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent')`),
          involved,
        ),
      )
      .orderBy(asc(councilMeetings.scheduledAt), asc(councilAgendaItems.orderIndex))
      .limit(100);

    const meetings = new Map<string, { kind: string; title: string | null; at: Date; date: string | null; topics: string[] }>();
    for (const r of rows) {
      const m = meetings.get(r.meetingId);
      if (m) m.topics.push(r.topic);
      else meetings.set(r.meetingId, { kind: r.kind, title: r.title, at: r.scheduledAt as Date, date: r.date, topics: [r.topic] });
    }

    const kindLabel = (k: string) => (k === "smeta" ? t("nav.smetaKengash") : t("nav.ekspertKengash"));
    const nowMs = Date.now();
    return [...meetings.entries()].slice(0, 5).map(([id, m]) => {
      const at = new Date(m.at);
      const tz = new Date(at.getTime() + 5 * 3600_000);
      const hhmm = `${String(tz.getUTCHours()).padStart(2, "0")}:${String(tz.getUTCMinutes()).padStart(2, "0")}`;
      // Vaqti belgilangan (Toshkent yarim tuni emas) va hali boshlanmagan majlis uchungina teskari sanoq.
      const timed = hhmm !== "00:00";
      const topics = m.topics.slice(0, 2).map((x) => clip(x, 60)).join("; ") + (m.topics.length > 2 ? ` +${m.topics.length - 2}` : "");
      return {
        key: `council:${id}`,
        kind: "council" as const,
        id,
        title: m.title?.trim() || kindLabel(m.kind),
        sub: joinSub(m.title?.trim() ? kindLabel(m.kind) : null, timed ? hhmm : null, topics),
        href: `/kengashlar/${m.kind === "smeta" ? "smeta" : "ekspert"}`,
        date: m.date,
        at: timed && at.getTime() > nowMs ? at.toISOString() : null,
        bucket: bucketOf(m.date, today),
      };
    });
  } catch {
    return [];
  }
}

async function srcTodos(userId: string, today: string): Promise<AgendaItem[]> {
  try {
    const rows = await db
      .select({
        id: personalTodos.id,
        title: personalTodos.title,
        note: personalTodos.note,
        dueDate: personalTodos.dueDate,
        doneAt: personalTodos.doneAt,
        orderIndex: personalTodos.orderIndex,
        linkedTaskId: personalTodos.linkedTaskId,
        linkedProjectId: personalTodos.linkedProjectId,
        taskTitle: tasks.title,
        projectName: projects.name,
      })
      .from(personalTodos)
      .leftJoin(tasks, eq(tasks.id, personalTodos.linkedTaskId))
      .leftJoin(projects, eq(projects.id, personalTodos.linkedProjectId))
      .where(
        and(
          eq(personalTodos.userId, userId),
          or(isNull(personalTodos.doneAt), gt(personalTodos.doneAt, sql`now() - interval '24 hours'`)),
        ),
      )
      .orderBy(asc(personalTodos.orderIndex), asc(personalTodos.createdAt))
      .limit(300);
    return rows.map((r) => {
      const date = r.dueDate ? String(r.dueDate).slice(0, 10) : null;
      const done = !!r.doneAt;
      let bucket = bucketOf(date, today);
      // Bajarilgan eslatma "muddati oʻtgan" boʻlib koʻrinmasin — bugun ostida chizilgan holda turadi.
      if (done && bucket === "overdue") bucket = "today";
      return {
        key: `todo:${r.id}`,
        kind: "todo" as const,
        id: r.id,
        title: r.title,
        sub: r.taskTitle ?? r.projectName ?? null,
        href: r.linkedTaskId ? `/tasks/${r.linkedTaskId}` : r.linkedProjectId ? `/projects/${r.linkedProjectId}` : null,
        date,
        bucket,
        done,
        todo: { note: r.note, linkedTaskId: r.linkedTaskId, linkedProjectId: r.linkedProjectId, orderIndex: r.orderIndex },
      };
    });
  } catch {
    return []; // 0031 hali qoʻllanmagan
  }
}

// ---------------- jamlash ----------------

function compareItems(a: AgendaItem, b: AgendaItem): number {
  const ba = BUCKET_ORDER.indexOf(a.bucket);
  const bb = BUCKET_ORDER.indexOf(b.bucket);
  if (ba !== bb) return ba - bb;
  // Bajarilganlar boʻlim oxirida.
  if (!!a.done !== !!b.done) return a.done ? 1 : -1;
  const da = a.date ?? "9999-99-99";
  const dbb = b.date ?? "9999-99-99";
  if (da !== dbb) return da < dbb ? -1 : 1;
  if (a.kind !== b.kind) return KIND_RANK[a.kind] - KIND_RANK[b.kind];
  if (a.kind === "council" && a.at && b.at && a.at !== b.at) return a.at < b.at ? -1 : 1;
  if (a.todo && b.todo) return a.todo.orderIndex - b.todo.orderIndex;
  return 0;
}

export async function getMyAgenda(
  userId: string,
  locale: string,
): Promise<{ items: AgendaItem[]; today: string; week: string[] }> {
  const today = todayTashkent();
  const week = weekDays(today);
  const tr = await getTranslations({ locale });
  const t: T = (key) => tr(key);
  // curatedProjectIds hech qachon rad etilmaydi (ichki try/catch) — kuratorlikka bogʻliq
  // manbalar unga zanjirlanadi, qolganlari parallel ishlaydi.
  const curated = curatedProjectIds(userId);

  const parts = await Promise.all([
    srcTasks(userId, today),
    srcApprovals(userId, today),
    srcStages(userId, today, locale),
    curated.then((c) => srcReviews(c, today, locale, t)),
    curated.then((c) => srcStudioRequests(c, today, locale, t)),
    curated.then((c) => srcCouncils(userId, c, today, locale, t)),
    srcTodos(userId, today),
  ]);

  // Stabil tartiblash: manba tartibi saqlanadi, keyin boʻlim/sana/tur boʻyicha.
  const items = parts.flat().sort(compareItems);
  return { items, today, week };
}

/**
 * Boshqaruv paneli uchun ixcham xulosa. Shaxsiy eslatmalar ataylab hisobga olinmaydi
 * (ular hech qachon panel hisoblagichlariga qoʻshilmaydi).
 */
export async function getTodaySummary(
  userId: string,
  locale = "uz-latn",
): Promise<{ today: number; overdue: number; approvals: number; top: AgendaItem[] }> {
  const { items } = await getMyAgenda(userId, locale);
  const work = items.filter((i) => i.kind !== "todo" && !i.done);
  const overdue = work.filter((i) => i.bucket === "overdue");
  const today = work.filter((i) => i.bucket === "today");
  return {
    today: today.length,
    overdue: overdue.length,
    approvals: work.filter((i) => i.kind === "approval").length,
    top: [...overdue, ...today].slice(0, 3),
  };
}
