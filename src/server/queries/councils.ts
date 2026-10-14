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
  // Kengash qarori: holat ('pending'|'approved'|'rejected'|'deferred') + erkin matn.
  decisionStatus: string;
  decision: string | null;
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
        decisionStatus: councilAgendaItems.decisionStatus,
        decision: councilAgendaItems.decision,
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
      decisionStatus: councilAgendaItems.decisionStatus,
      decision: councilAgendaItems.decision,
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

/** Bayonnoma (protokol) PDF'i uçun bitta kun tartibi bandi — nomlari hal qilingan. */
export type ProtocolItem = {
  orderIndex: number;
  topic: string;
  projectName: string | null;
  presenterName: string | null;
  decisionStatus: string;
  decision: string | null;
};

/** Bayonnoma uçun majlis + uning tartiblangan kun tartibi. */
export type ProtocolMeeting = {
  id: string;
  kind: string;
  scheduledAt: Date;
  title: string | null;
  items: ProtocolItem[];
};

/**
 * Bayonnoma (kengash majlisi protokoli) PDF'i uçun majlis va uning tartiblangan kun
 * tartibini qaytaradi: har bir bandning mavzusi, loyihasi/ma'ruzaçisi (nomlari hal
 * qilingan) hamda qarori (holat + matn). Majlis topilmasa null.
 */
export async function getMeetingForProtocol(meetingId: string): Promise<ProtocolMeeting | null> {
  const [meeting] = await db
    .select({
      id: councilMeetings.id,
      kind: councilMeetings.kind,
      scheduledAt: councilMeetings.scheduledAt,
      title: councilMeetings.title,
    })
    .from(councilMeetings)
    .where(eq(councilMeetings.id, meetingId))
    .limit(1);
  if (!meeting) return null;

  const items = await db
    .select({
      orderIndex: councilAgendaItems.orderIndex,
      topic: councilAgendaItems.topic,
      projectName: sql<string | null>`coalesce(${projects.name}, ${councilAgendaItems.projectName})`,
      presenterName: sql<string | null>`coalesce(${users.fullName}, ${councilAgendaItems.presenterName})`,
      decisionStatus: councilAgendaItems.decisionStatus,
      decision: councilAgendaItems.decision,
    })
    .from(councilAgendaItems)
    .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
    .leftJoin(users, eq(users.id, councilAgendaItems.presenterUserId))
    .where(eq(councilAgendaItems.meetingId, meetingId))
    .orderBy(asc(councilAgendaItems.orderIndex));

  return { ...meeting, items };
}
