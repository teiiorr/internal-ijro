import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectStages, milestones } from "@/lib/db/schema";
import { overallProgress, stageProgress } from "./progress";

/**
 * Loyihaning bajariliş foizini qayta hisoblaydi va saqlaydi.
 * Model türiga qarab ajraladi, şuning uçun ikkalasi hech qaçon aralaşmaydi:
 * turlangan loyihalar (project_stages bilan) tugallangan/jami nisbatini işlatadi;
 * eski loyihalar esa milestone'larning vaznli örtaçasini işlatadi.
 * Hech qanday "use server" modulida saqlanmaydi, şuning uçun uni hech qaçon client action sifatida çaqirib bölmaydi.
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
