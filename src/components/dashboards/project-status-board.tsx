import { getTranslations } from "next-intl/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconClipboardText as Board } from "@tabler/icons-react";
import { derivedStatus } from "@/lib/projects/progress";
import { ProjectStatusSearch, type ProjectStatusRow } from "./project-status-search";

/** Dashboard board of every project's "joriy holat" (current-status note), searchable. */
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
    <Card>
      <CardHeader className="flex-row items-center gap-3 pb-4">
        <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)]">
          <Board className="size-5 text-[var(--primary)]" />
        </div>
        <div>
          <CardTitle className="text-lg">{t("dashboard.currentStatus.title")}</CardTitle>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{t("dashboard.currentStatus.subtitle")}</p>
        </div>
      </CardHeader>
      <CardContent>
        <ProjectStatusSearch projects={data} />
      </CardContent>
    </Card>
  );
}
