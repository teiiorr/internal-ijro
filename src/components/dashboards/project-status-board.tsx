import { getTranslations } from "next-intl/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { derivedStatus } from "@/lib/projects/progress";
import { ProjectStatusSearch, type ProjectStatusRow } from "./project-status-search";

/** Har bir loyihaning "joriy holat" izohini koʻrsatadigan, qidiruvli taxta. */
export async function ProjectStatusBoard() {
  const t = await getTranslations();
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      currentStatus: projects.currentStatus,
      progressPercentage: projects.progressPercentage,
      statusOverride: projects.statusOverride,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  const data: ProjectStatusRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    currentStatus: r.currentStatus,
    status: derivedStatus(r.progressPercentage, r.statusOverride),
  }));

  return (
    <Section title={t("dashboard.currentStatus.title")}>
      <Card>
        <ProjectStatusSearch projects={data} />
      </Card>
    </Section>
  );
}
