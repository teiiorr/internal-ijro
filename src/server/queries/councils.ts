import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { councilMeetings, councilAgendaItems, projects, users } from "@/lib/db/schema";

export type AgendaRow = {
  id: string;
  orderIndex: number;
  topic: string;
  projectId: string | null;
  projectName: string | null;
  presenterUserId: string | null;
  presenterName: string | null;
};

/** Everything the council page needs: the nearest upcoming meeting + its agenda, and the full history. */
export async function getCouncilPage(kind: string) {
  const meetings = await db
    .select()
    .from(councilMeetings)
    .where(eq(councilMeetings.kind, kind))
    .orderBy(desc(councilMeetings.scheduledAt));

  // Upcoming = soonest meeting still in the future.
  const upcoming = (
    await db
      .select()
      .from(councilMeetings)
      .where(and(eq(councilMeetings.kind, kind), gte(councilMeetings.scheduledAt, new Date())))
      .orderBy(asc(councilMeetings.scheduledAt))
      .limit(1)
  )[0] ?? null;

  let agenda: AgendaRow[] = [];
  if (upcoming) {
    agenda = await db
      .select({
        id: councilAgendaItems.id,
        orderIndex: councilAgendaItems.orderIndex,
        topic: councilAgendaItems.topic,
        projectId: councilAgendaItems.projectId,
        projectName: sql<string | null>`coalesce(${projects.name}, ${councilAgendaItems.projectName})`,
        presenterUserId: councilAgendaItems.presenterUserId,
        presenterName: sql<string | null>`coalesce(${users.fullName}, ${councilAgendaItems.presenterName})`,
      })
      .from(councilAgendaItems)
      .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
      .leftJoin(users, eq(users.id, councilAgendaItems.presenterUserId))
      .where(eq(councilAgendaItems.meetingId, upcoming.id))
      .orderBy(asc(councilAgendaItems.orderIndex));
  }

  // Agenda for every meeting of this kind → lets the history render as an
  // expandable archive (each past meeting shows its own kun tartibi inside).
  const allItems = await db
    .select({
      meetingId: councilAgendaItems.meetingId,
      id: councilAgendaItems.id,
      orderIndex: councilAgendaItems.orderIndex,
      topic: councilAgendaItems.topic,
      projectId: councilAgendaItems.projectId,
      projectName: sql<string | null>`coalesce(${projects.name}, ${councilAgendaItems.projectName})`,
      presenterUserId: councilAgendaItems.presenterUserId,
      presenterName: sql<string | null>`coalesce(${users.fullName}, ${councilAgendaItems.presenterName})`,
    })
    .from(councilAgendaItems)
    .innerJoin(councilMeetings, eq(councilMeetings.id, councilAgendaItems.meetingId))
    .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
    .leftJoin(users, eq(users.id, councilAgendaItems.presenterUserId))
    .where(eq(councilMeetings.kind, kind))
    .orderBy(asc(councilAgendaItems.orderIndex));

  const agendaByMeeting: Record<string, AgendaRow[]> = {};
  for (const { meetingId, ...row } of allItems) {
    (agendaByMeeting[meetingId] ??= []).push(row);
  }

  return { meetings, upcoming, agenda, agendaByMeeting };
}
