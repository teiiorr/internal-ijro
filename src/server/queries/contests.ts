import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, contestPhotos, contestFiles, contestComments, projects, users } from "@/lib/db/schema";

export type ContestPhoto = { id: string; fileUrl: string; fileName: string; caption: string | null };
export type ContestFile = { id: string; fileUrl: string; fileName: string; fileSize: number | null; uploaderName: string | null; uploadedAt: Date | string };
export type ContestComment = { id: string; body: string; userName: string | null; userAvatarUrl: string | null; createdAt: Date | string };
export type ContestWithPhotos = {
  id: string;
  name: string;
  participantsCount: number;
  winnerName: string | null;
  winnerProjectName: string | null;
  winnerLogoUrl: string | null;
  description: string | null;
  heldAt: string | null;
  photos: ContestPhoto[];
};
export type ContestDetail = ContestWithPhotos & {
  files: ContestFile[];
  comments: ContestComment[];
};

/** All contests, newest first, each with its ordered photos. */
export async function listContests(): Promise<ContestWithPhotos[]> {
  const rows = await db
    .select({
      id: contests.id,
      name: contests.name,
      participantsCount: contests.participantsCount,
      winnerName: contests.winnerName,
      winnerLogoUrl: contests.winnerLogoUrl,
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

/** Single contest with its photos, files and comments (for the detail page). */
export async function getContest(id: string): Promise<ContestDetail | null> {
  const [c] = await db
    .select({
      id: contests.id,
      name: contests.name,
      participantsCount: contests.participantsCount,
      winnerName: contests.winnerName,
      winnerLogoUrl: contests.winnerLogoUrl,
      description: contests.description,
      heldAt: contests.heldAt,
      winnerProjectName: projects.name,
    })
    .from(contests)
    .leftJoin(projects, eq(projects.id, contests.winnerProjectId))
    .where(eq(contests.id, id))
    .limit(1);
  if (!c) return null;

  const [photos, files, comments] = await Promise.all([
    db
      .select({ id: contestPhotos.id, fileUrl: contestPhotos.fileUrl, fileName: contestPhotos.fileName, caption: contestPhotos.caption })
      .from(contestPhotos)
      .where(eq(contestPhotos.contestId, id))
      .orderBy(asc(contestPhotos.orderIndex), asc(contestPhotos.uploadedAt)),
    db
      .select({ id: contestFiles.id, fileUrl: contestFiles.fileUrl, fileName: contestFiles.fileName, fileSize: contestFiles.fileSize, uploaderName: users.fullName, uploadedAt: contestFiles.uploadedAt })
      .from(contestFiles)
      .leftJoin(users, eq(users.id, contestFiles.uploadedByUserId))
      .where(eq(contestFiles.contestId, id))
      .orderBy(desc(contestFiles.uploadedAt)),
    db
      .select({ id: contestComments.id, body: contestComments.body, userName: users.fullName, userAvatarUrl: users.avatarUrl, createdAt: contestComments.createdAt })
      .from(contestComments)
      .leftJoin(users, eq(users.id, contestComments.userId))
      .where(eq(contestComments.contestId, id))
      .orderBy(desc(contestComments.createdAt)),
  ]);

  return {
    ...c,
    heldAt: c.heldAt as string | null,
    photos,
    files,
    comments,
  };
}
