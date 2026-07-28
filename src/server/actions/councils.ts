"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { councilMeetings, councilAgendaItems } from "@/lib/db/schema";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";

const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;
const KINDS = ["ekspert", "smeta"] as const;

function revalidate(kind: string) {
  revalidatePath(`/kengashlar/${kind}`);
}

const meetingSchema = z.object({
  kind: z.enum(KINDS),
  scheduledAt: z.string().min(1), // ISO datetime-local
  title: z.string().max(255).nullable().optional(),
});

export async function createCouncilMeeting(input: z.infer<typeof meetingSchema>) {
  const me = await requirePosition([...MANAGERS]);
  const parsed = meetingSchema.parse(input);
  const ins = await db
    .insert(councilMeetings)
    .values({
      kind: parsed.kind,
      scheduledAt: new Date(parsed.scheduledAt),
      title: parsed.title || null,
      createdByUserId: me.id,
    })
    .returning({ id: councilMeetings.id });
  await logActivity({ userId: me.id, action: "council.meeting_created", entityType: "council_meeting", entityId: ins[0].id, newValue: { kind: parsed.kind } });
  revalidate(parsed.kind);
  return { id: ins[0].id };
}

export async function deleteCouncilMeeting(meetingId: string) {
  const me = await requirePosition(["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"]);
  const [m] = await db.select({ kind: councilMeetings.kind }).from(councilMeetings).where(eq(councilMeetings.id, meetingId)).limit(1);
  if (!m) return;
  await db.delete(councilMeetings).where(eq(councilMeetings.id, meetingId));
  await logActivity({ userId: me.id, action: "council.meeting_deleted", entityType: "council_meeting", entityId: meetingId });
  revalidate(m.kind);
}

const agendaSchema = z.object({
  meetingId: z.string().uuid(),
  topic: z.string().min(1).max(500),
  // Project: either a registered project (projectId) OR a free-text name.
  projectId: z.string().uuid().nullable().optional(),
  projectName: z.string().max(255).nullable().optional(),
  // Presenter: either a registered user (presenterUserId) OR a free-text name.
  presenterUserId: z.string().uuid().nullable().optional(),
  presenterName: z.string().max(255).nullable().optional(),
});

async function meetingKind(meetingId: string): Promise<string> {
  const [m] = await db.select({ kind: councilMeetings.kind }).from(councilMeetings).where(eq(councilMeetings.id, meetingId)).limit(1);
  if (!m) throw new Error("not_found");
  return m.kind;
}

export async function addAgendaItem(input: z.infer<typeof agendaSchema>) {
  const me = await requirePosition([...MANAGERS]);
  const parsed = agendaSchema.parse(input);
  const kind = await meetingKind(parsed.meetingId);
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${councilAgendaItems.orderIndex}), -1) + 1` })
    .from(councilAgendaItems)
    .where(eq(councilAgendaItems.meetingId, parsed.meetingId));
  await db.insert(councilAgendaItems).values({
    meetingId: parsed.meetingId,
    orderIndex: Number(next) || 0,
    topic: parsed.topic,
    // A registered id wins; otherwise keep the typed-in name.
    projectId: parsed.projectId || null,
    projectName: parsed.projectId ? null : parsed.projectName?.trim() || null,
    presenterUserId: parsed.presenterUserId || null,
    presenterName: parsed.presenterUserId ? null : parsed.presenterName?.trim() || null,
  });
  await logActivity({ userId: me.id, action: "council.agenda_added", entityType: "council_meeting", entityId: parsed.meetingId });
  revalidate(kind);
}

export async function deleteAgendaItem(itemId: string) {
  const me = await requirePosition([...MANAGERS]);
  const [row] = await db.select({ meetingId: councilAgendaItems.meetingId }).from(councilAgendaItems).where(eq(councilAgendaItems.id, itemId)).limit(1);
  if (!row) return;
  const kind = await meetingKind(row.meetingId);
  await db.delete(councilAgendaItems).where(eq(councilAgendaItems.id, itemId));
  await logActivity({ userId: me.id, action: "council.agenda_deleted", entityType: "council_meeting", entityId: row.meetingId });
  revalidate(kind);
}
