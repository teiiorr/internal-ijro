import "server-only";
import { and, eq, gte, isNotNull, lte, ne, notInArray, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { councilMeetings, projects, projectStages, tasks } from "@/lib/db/schema";

/** Kalendar bitta xonasida koʻrsatiladigan bitta hodisa (bosqich muddati, vazifa muddati yoki majlis). */
export type CalendarEvent = {
  /** Toshkent (UTC+5) boʻyicha kalendar kuni, "YYYY-MM-DD". */
  date: string;
  type: "stage" | "task" | "meeting";
  title: string;
  subtitle: string | null;
  href: string;
};

/**
 * [fromISO, toISO] oraligʻidagi (ikkala chet kiritiladi) barcha ishlab chiqarish
 * hodisalarining yassilangan roʻyxati. Har bir hodisa Asia/Tashkent vaqt mintaqasida
 * kunga ajratiladi: `plannedDeadline` sof sana ustun (mintaqa oʻzgartirilmaydi),
 * `deadline`/`scheduledAt` esa timestamptz → `AT TIME ZONE 'Asia/Tashkent'` orqali.
 */
export async function getCalendarEvents(fromISO: string, toISO: string): Promise<CalendarEvent[]> {
  const t = await getTranslations();

  // 1) Bosqich muddatlari — yakunlanmagan bosqichlar.
  const stageRows = await db
    .select({
      stageId: projectStages.id,
      projectId: projectStages.projectId,
      name: projectStages.name,
      projectName: projects.name,
      date: sql<string>`to_char(${projectStages.plannedDeadline}, 'YYYY-MM-DD')`,
    })
    .from(projectStages)
    .innerJoin(projects, eq(projects.id, projectStages.projectId))
    .where(
      and(
        isNotNull(projectStages.plannedDeadline),
        gte(projectStages.plannedDeadline, fromISO),
        lte(projectStages.plannedDeadline, toISO),
        ne(projectStages.status, "completed"),
      ),
    );

  // 2) Vazifa muddatlari — ochiq vazifalar (yakunlangan/rad etilgan emas).
  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectName: projects.name,
      date: sql<string>`to_char(${tasks.deadline} AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD')`,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        isNotNull(tasks.deadline),
        sql`(${tasks.deadline} AT TIME ZONE 'Asia/Tashkent')::date BETWEEN ${fromISO}::date AND ${toISO}::date`,
        notInArray(tasks.status, ["completed", "rejected"]),
      ),
    );

  // 3) Kengash majlislari — Ekspertlar Kengashi / Smeta Komissiyasi.
  const meetingRows = await db
    .select({
      kind: councilMeetings.kind,
      title: councilMeetings.title,
      date: sql<string>`to_char(${councilMeetings.scheduledAt} AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD')`,
    })
    .from(councilMeetings)
    .where(
      sql`(${councilMeetings.scheduledAt} AT TIME ZONE 'Asia/Tashkent')::date BETWEEN ${fromISO}::date AND ${toISO}::date`,
    );

  const kindLabel = (kind: string) =>
    kind === "ekspert" ? t("nav.ekspertKengash") : kind === "smeta" ? t("nav.smetaKengash") : kind;

  const events: CalendarEvent[] = [
    ...stageRows.map((r) => ({
      date: r.date,
      // Avval LOYIHA (title), soʻng QAYSI BOSQICH (subtitle) — ikki alohida qator.
      type: "stage" as const,
      title: r.projectName,
      subtitle: r.name,
      href: `/projects/${r.projectId}/stages/${r.stageId}`,
    })),
    ...taskRows.map((r) => ({
      date: r.date,
      type: "task" as const,
      title: r.title,
      subtitle: r.projectName ?? null,
      href: `/tasks/${r.id}`,
    })),
    ...meetingRows.map((r) => ({
      date: r.date,
      type: "meeting" as const,
      title: r.title ?? kindLabel(r.kind),
      subtitle: null,
      href: `/kengashlar/${r.kind}`,
    })),
  ];

  // Barqaror tartib: kun boʻyicha, soʻngra tur boʻyicha (stage → task → meeting).
  const typeOrder = { stage: 0, task: 1, meeting: 2 } as const;
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : typeOrder[a.type] - typeOrder[b.type]));

  return events;
}
