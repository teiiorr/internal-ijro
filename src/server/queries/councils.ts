import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { councilMeetings, councilAgendaItems, projects, users, externalCompanies } from "@/lib/db/schema";

export type AgendaRow = {
  id: string;
  orderIndex: number;
  topic: string;
  projectId: string | null;
  projectName: string | null;
  studioName: string | null;
  presenterUserId: string | null;
  presenterName: string | null;
};

/** Kengaş sahifasiga kerak bölgan hamma narsa: eng yaqin böladigan majlis + uning kun tartibi, va töliq tarix. */
export async function getCouncilPage(kind: string) {
  const meetings = await db
    .select()
    .from(councilMeetings)
    .where(eq(councilMeetings.kind, kind))
    .orderBy(desc(councilMeetings.scheduledAt));

  // Böladigan = hali kelajakdagi eng yaqin majlis.
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
        studioName: externalCompanies.name,
        presenterUserId: councilAgendaItems.presenterUserId,
        presenterName: sql<string | null>`coalesce(${users.fullName}, ${councilAgendaItems.presenterName})`,
      })
      .from(councilAgendaItems)
      .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
      .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
      .leftJoin(users, eq(users.id, councilAgendaItems.presenterUserId))
      .where(eq(councilAgendaItems.meetingId, upcoming.id))
      .orderBy(asc(councilAgendaItems.orderIndex));
  }

  // Şu turdagi har bir majlis uçun kun tartibi → tarixni yoyiladigan arxiv
  // körinişida körsatiş imkonini beradi (har bir ötgan majlis öz kun tartibini içida körsatadi).
  const allItems = await db
    .select({
      meetingId: councilAgendaItems.meetingId,
      id: councilAgendaItems.id,
      orderIndex: councilAgendaItems.orderIndex,
      topic: councilAgendaItems.topic,
      projectId: councilAgendaItems.projectId,
      projectName: sql<string | null>`coalesce(${projects.name}, ${councilAgendaItems.projectName})`,
      studioName: externalCompanies.name,
      presenterUserId: councilAgendaItems.presenterUserId,
      presenterName: sql<string | null>`coalesce(${users.fullName}, ${councilAgendaItems.presenterName})`,
    })
    .from(councilAgendaItems)
    .innerJoin(councilMeetings, eq(councilMeetings.id, councilAgendaItems.meetingId))
    .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
    .leftJoin(externalCompanies, eq(externalCompanies.id, projects.externalCompanyId))
    .leftJoin(users, eq(users.id, councilAgendaItems.presenterUserId))
    .where(eq(councilMeetings.kind, kind))
    .orderBy(asc(councilAgendaItems.orderIndex));

  const agendaByMeeting: Record<string, AgendaRow[]> = {};
  for (const { meetingId, ...row } of allItems) {
    (agendaByMeeting[meetingId] ??= []).push(row);
  }

  return { meetings, upcoming, agenda, agendaByMeeting };
}
