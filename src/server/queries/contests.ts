import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, contestPhotos, projects } from "@/lib/db/schema";

export type ContestPhoto = { id: string; fileUrl: string; fileName: string; caption: string | null };
export type ContestWithPhotos = {
  id: string;
  name: string;
  participantsCount: number;
  winnerName: string | null;
  winnerProjectName: string | null;
  description: string | null;
  heldAt: string | null;
  photos: ContestPhoto[];
};

/** All contests, newest first, each with its ordered photos. */
export async function listContests(): Promise<ContestWithPhotos[]> {
  const rows = await db
    .select({
      id: contests.id,
      name: contests.name,
      participantsCount: contests.participantsCount,
      winnerName: contests.winnerName,
      description: contests.description,
      heldAt: contests.heldAt,
      winnerProjectName: projects.name,
    })
    .from(contests)
    .leftJoin(projects, eq(projects.id, contests.winnerProjectId))
    .orderBy(desc(contests.heldAt), desc(contests.createdAt));
  if (rows.length === 0) return [];

  const photos = await db
    .select({
      id: contestPhotos.id,
      contestId: contestPhotos.contestId,
      fileUrl: contestPhotos.fileUrl,
      fileName: contestPhotos.fileName,
      caption: contestPhotos.caption,
    })
    .from(contestPhotos)
    .orderBy(asc(contestPhotos.orderIndex), asc(contestPhotos.uploadedAt));

  const byContest = new Map<string, ContestPhoto[]>();
  for (const p of photos) {
    const arr = byContest.get(p.contestId) ?? [];
    arr.push({ id: p.id, fileUrl: p.fileUrl, fileName: p.fileName, caption: p.caption });
    byContest.set(p.contestId, arr);
  }

  return rows.map((r) => ({
    ...r,
    heldAt: r.heldAt as string | null,
    photos: byContest.get(r.id) ?? [],
  }));
}
