import "server-only";
import { and, asc, desc, eq, gte } from "drizzle-orm";
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
        projectName: projects.name,
        presenterUserId: councilAgendaItems.presenterUserId,
        presenterName: users.fullName,
      })
      .from(councilAgendaItems)
      .leftJoin(projects, eq(projects.id, councilAgendaItems.projectId))
      .leftJoin(users, eq(users.id, councilAgendaItems.presenterUserId))
      .where(eq(councilAgendaItems.meetingId, upcoming.id))
      .orderBy(asc(councilAgendaItems.orderIndex));
  }

  return { meetings, upcoming, agenda };
}
