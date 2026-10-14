"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { councilMeetings, councilAgendaItems } from "@/lib/db/schema";
import { requirePosition } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { type ActionResult, ok, err } from "@/lib/action-result";

const MANAGERS = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"] as const;
const KINDS = ["ekspert", "smeta"] as const;

function revalidate(kind: string) {
  revalidatePath(`/kengashlar/${kind}`);
}

const meetingSchema = z.object({
  kind: z.enum(KINDS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), // HH:mm (ixtiyoriy)
  title: z.string().max(255).nullable().optional(),
});

export async function createCouncilMeeting(input: z.infer<typeof meetingSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await requirePosition([...MANAGERS]);
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const p = parsed.data;
  // Toşkent vaqti böyiça aniq (+05:00) lahzani hosil qilamiz. Faqat sana körsatilgan
  // yiğilişlar Toşkent vaqti bilan yarim tunda saqlanadi, şunda UI ularni vaqtsiz körsata oladi.
  const time = p.time || "00:00";
  const scheduledAt = new Date(`${p.date}T${time}:00+05:00`);
  const ins = await db
    .insert(councilMeetings)
    .values({
      kind: p.kind,
      scheduledAt,
      title: p.title || null,
      createdByUserId: me.id,
    })
    .returning({ id: councilMeetings.id });
  await logActivity({ userId: me.id, action: "council.meeting_created", entityType: "council_meeting", entityId: ins[0].id, newValue: { kind: p.kind } });
  revalidate(p.kind);
  return { ok: true, id: ins[0].id };
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
  // Loyiha: yo röyxatdan ötgan loyiha (projectId), yo erkin matnli nom.
  projectId: z.string().uuid().nullable().optional(),
  projectName: z.string().max(255).nullable().optional(),
  // Taqdimotçi: yo röyxatdan ötgan foydalanuvçi (presenterUserId), yo erkin matnli nom.
  presenterUserId: z.string().uuid().nullable().optional(),
  presenterName: z.string().max(255).nullable().optional(),
});

async function meetingKind(meetingId: string): Promise<string | null> {
  const [m] = await db.select({ kind: councilMeetings.kind }).from(councilMeetings).where(eq(councilMeetings.id, meetingId)).limit(1);
  return m?.kind ?? null;
}

export async function addAgendaItem(input: z.infer<typeof agendaSchema>): Promise<ActionResult> {
  const me = await requirePosition([...MANAGERS]);
  const parsed = agendaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const p = parsed.data;
  const kind = await meetingKind(p.meetingId);
  if (!kind) return { ok: false, error: "not_found" };
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${councilAgendaItems.orderIndex}), -1) + 1` })
    .from(councilAgendaItems)
    .where(eq(councilAgendaItems.meetingId, p.meetingId));
  await db.insert(councilAgendaItems).values({
    meetingId: p.meetingId,
    orderIndex: Number(next) || 0,
    topic: p.topic,
    // Röyxatdan ötgan id ustun; aks holda qölda kiritilgan nom saqlanadi.
    projectId: p.projectId || null,
    projectName: p.projectId ? null : p.projectName?.trim() || null,
    presenterUserId: p.presenterUserId || null,
    presenterName: p.presenterUserId ? null : p.presenterName?.trim() || null,
  });
  await logActivity({ userId: me.id, action: "council.agenda_added", entityType: "council_meeting", entityId: p.meetingId });
  revalidate(kind);
  return { ok: true };
}

const DECISION_STATUSES = ["pending", "approved", "rejected", "deferred"] as const;

const decisionSchema = z.object({
  decisionStatus: z.enum(DECISION_STATUSES),
  decision: z.string().max(2000).nullable().optional(),
});

/**
 * Kun tartibi bandiga kengash qarorini yozadi: holat (ma'qullandi/rad etildi/keyinga
 * qoldirildi/kutilmoqda) + ixtiyoriy erkin matn. Ruxsat — boşqa kengash amallari bilan
 * bir xil (MANAGERS lavozimlari). Holat 4 qiymatdan biri bölmasa — err("invalid").
 */
export async function setAgendaDecision(
  itemId: string,
  input: z.infer<typeof decisionSchema>,
): Promise<ActionResult> {
  const me = await requirePosition([...MANAGERS]);
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return err("invalid");
  const p = parsed.data;

  const [row] = await db
    .select({ meetingId: councilAgendaItems.meetingId })
    .from(councilAgendaItems)
    .where(eq(councilAgendaItems.id, itemId))
    .limit(1);
  if (!row) return err("not_found");
  const kind = await meetingKind(row.meetingId);
  if (!kind) return err("not_found");

  await db
    .update(councilAgendaItems)
    .set({ decisionStatus: p.decisionStatus, decision: p.decision?.trim() || null })
    .where(eq(councilAgendaItems.id, itemId));
  await logActivity({ userId: me.id, action: "council.decision_set", entityType: "council_meeting", entityId: row.meetingId, newValue: { decisionStatus: p.decisionStatus } });
  revalidate(kind);
  return ok();
}

export async function deleteAgendaItem(itemId: string) {
  const me = await requirePosition([...MANAGERS]);
  const [row] = await db.select({ meetingId: councilAgendaItems.meetingId }).from(councilAgendaItems).where(eq(councilAgendaItems.id, itemId)).limit(1);
  if (!row) return;
  const kind = await meetingKind(row.meetingId);
  await db.delete(councilAgendaItems).where(eq(councilAgendaItems.id, itemId));
  await logActivity({ userId: me.id, action: "council.agenda_deleted", entityType: "council_meeting", entityId: row.meetingId });
  if (kind) revalidate(kind);
}
