"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contests, contestPhotos } from "@/lib/db/schema";
import { requireProjectEditor } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { deleteFileByUrl } from "@/lib/upload";

const contestSchema = z.object({
  name: z.string().trim().min(2).max(255),
  participantsCount: z.number().int().min(0).max(1_000_000).optional(),
  winnerName: z.string().trim().max(255).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  heldAt: z.string().nullable().optional(),
});
export type ContestInput = z.infer<typeof contestSchema>;

export async function createContest(input: ContestInput) {
  const me = await requireProjectEditor();
  const p = contestSchema.parse(input);
  const [row] = await db
    .insert(contests)
    .values({
      name: p.name,
      participantsCount: p.participantsCount ?? 0,
      winnerName: p.winnerName?.trim() || null,
      description: p.description?.trim() || null,
      heldAt: p.heldAt || null,
      createdByUserId: me.id,
    })
    .returning({ id: contests.id });
  await logActivity({ userId: me.id, action: "contest.created", entityType: "contest", entityId: row.id, newValue: { name: p.name } });
  revalidatePath("/tanlov");
  return { id: row.id };
}

export async function updateContest(id: string, input: ContestInput) {
  const me = await requireProjectEditor();
  const p = contestSchema.parse(input);
  await db
    .update(contests)
    .set({
      name: p.name,
      participantsCount: p.participantsCount ?? 0,
      winnerName: p.winnerName?.trim() || null,
      description: p.description?.trim() || null,
      heldAt: p.heldAt || null,
      updatedAt: new Date(),
    })
    .where(eq(contests.id, id));
  await logActivity({ userId: me.id, action: "contest.updated", entityType: "contest", entityId: id });
  revalidatePath("/tanlov");
}

export async function deleteContest(id: string) {
  const me = await requireProjectEditor();
  const photos = await db.select({ url: contestPhotos.fileUrl }).from(contestPhotos).where(eq(contestPhotos.contestId, id));
  for (const ph of photos) await deleteFileByUrl(ph.url);
  await db.delete(contests).where(eq(contests.id, id)); // photo rows cascade
  await logActivity({ userId: me.id, action: "contest.deleted", entityType: "contest", entityId: id });
  revalidatePath("/tanlov");
}

export async function removeContestPhoto(photoId: string) {
  const me = await requireProjectEditor();
  const [ph] = await db.select().from(contestPhotos).where(eq(contestPhotos.id, photoId)).limit(1);
  if (!ph) return;
  await deleteFileByUrl(ph.fileUrl);
  await db.delete(contestPhotos).where(eq(contestPhotos.id, photoId));
  await logActivity({ userId: me.id, action: "contest.photo_removed", entityType: "contest", entityId: ph.contestId });
  revalidatePath("/tanlov");
}
