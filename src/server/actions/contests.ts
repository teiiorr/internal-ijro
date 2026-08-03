"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contests, contestPhotos, contestFiles, contestComments } from "@/lib/db/schema";
import { requireProjectEditor, requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { deleteFileByUrl } from "@/lib/upload";

function rp(id: string) {
  revalidatePath("/tanlov");
  revalidatePath(`/tanlov/${id}`);
}

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
  rp(id);
}

export async function deleteContest(id: string) {
  const me = await requireProjectEditor();
  const [photos, files, [c]] = await Promise.all([
    db.select({ url: contestPhotos.fileUrl }).from(contestPhotos).where(eq(contestPhotos.contestId, id)),
    db.select({ url: contestFiles.fileUrl }).from(contestFiles).where(eq(contestFiles.contestId, id)),
    db.select({ logo: contests.winnerLogoUrl }).from(contests).where(eq(contests.id, id)).limit(1),
  ]);
  for (const ph of photos) await deleteFileByUrl(ph.url);
  for (const f of files) await deleteFileByUrl(f.url);
  if (c?.logo) await deleteFileByUrl(c.logo);
  await db.delete(contests).where(eq(contests.id, id)); // photo/file/comment rows cascade
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
  rp(ph.contestId);
}

export async function removeContestFile(fileId: string) {
  const me = await requireProjectEditor();
  const [f] = await db.select().from(contestFiles).where(eq(contestFiles.id, fileId)).limit(1);
  if (!f) return;
  await deleteFileByUrl(f.fileUrl);
  await db.delete(contestFiles).where(eq(contestFiles.id, fileId));
  await logActivity({ userId: me.id, action: "contest.file_removed", entityType: "contest", entityId: f.contestId });
  rp(f.contestId);
}

export async function removeContestLogo(contestId: string) {
  const me = await requireProjectEditor();
  const [c] = await db.select({ logo: contests.winnerLogoUrl }).from(contests).where(eq(contests.id, contestId)).limit(1);
  if (c?.logo) await deleteFileByUrl(c.logo);
  await db.update(contests).set({ winnerLogoUrl: null }).where(eq(contests.id, contestId));
  await logActivity({ userId: me.id, action: "contest.logo_removed", entityType: "contest", entityId: contestId });
  rp(contestId);
}

const commentSchema = z.object({ contestId: z.string().uuid(), body: z.string().trim().min(1).max(2000) });

/** Comments are open to all internal staff. */
export async function addContestComment(input: z.infer<typeof commentSchema>) {
  const me = await requireUser();
  const p = commentSchema.parse(input);
  await db.insert(contestComments).values({ contestId: p.contestId, userId: me.id, body: p.body });
  rp(p.contestId);
}

export async function removeContestComment(commentId: string) {
  const me = await requireUser();
  const [cm] = await db.select().from(contestComments).where(eq(contestComments.id, commentId)).limit(1);
  if (!cm) return;
  // Author can delete own; project-editors can delete any.
  const editor = (await import("@/lib/permissions/project-editors")).canEditProjects(me.email);
  if (cm.userId !== me.id && !editor) return;
  await db.delete(contestComments).where(eq(contestComments.id, commentId));
  rp(cm.contestId);
}
