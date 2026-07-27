import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectStages, milestones } from "@/lib/db/schema";
import { overallProgress, stageProgress } from "./progress";

/**
 * Recompute and persist a project's progress percentage.
 * Branches by model so the two never mix: typed projects (with project_stages)
 * use completed/total; legacy projects use the weighted milestone average.
 * Kept out of any "use server" module so it is never callable as a client action.
 */
export async function recalcProjectProgress(projectId: string): Promise<number> {
  const stages = await db
    .select({ status: projectStages.status })
    .from(projectStages)
    .where(eq(projectStages.projectId, projectId));

  const pct =
    stages.length > 0
      ? stageProgress(stages)
      : overallProgress(
          await db
            .select({ progress: milestones.progress, weight: milestones.weight })
            .from(milestones)
            .where(eq(milestones.projectId, projectId))
        );

  await db
    .update(projects)
    .set({ progressPercentage: pct, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  return pct;
}
