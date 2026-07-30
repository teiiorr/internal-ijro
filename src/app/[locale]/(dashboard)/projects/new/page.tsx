import { redirect } from "next/navigation";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { getTranslations, getLocale } from "next-intl/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, users, projectTypes } from "@/lib/db/schema";
import { localizedTypeName } from "@/server/queries/stages";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  // Open to all internal staff (temporary — refine later). Only external contractors are blocked.
  if (session.user.position === "kontragent") redirect("/projects");
  if (!canEditProjects(session.user.email)) redirect("/projects");
  const [companies, curators, responsibles, typeRows] = await Promise.all([
    db.select({ id: externalCompanies.id, name: externalCompanies.name }).from(externalCompanies).where(eq(externalCompanies.status, "approved")).orderBy(externalCompanies.name),
    db.select({ id: users.id, fullName: users.fullName }).from(users).where(sql`${users.status}='active' AND ${users.position} <> 'kontragent'`).orderBy(users.fullName),
    // mas'ul can be any active internal employee (not external contractors)
    db.select({ id: users.id, fullName: users.fullName }).from(users).where(sql`${users.status}='active' AND ${users.position} <> 'kontragent'`).orderBy(users.fullName),
    db.select().from(projectTypes).where(eq(projectTypes.isActive, true)).orderBy(projectTypes.orderIndex),
  ]);
  const types = typeRows.map((r) => ({ id: r.id, name: localizedTypeName(r, locale) }));
  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>{t("projects.newTitle")}</CardTitle></CardHeader>
      <CardContent>
        <NewProjectForm companies={companies} curators={curators} responsibles={responsibles} types={types} />
      </CardContent>
    </Card>
  );
}
