import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, users } from "@/lib/db/schema";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  if (!["direktor", "orinbosar", "koordinator"].includes(session.user.position)) redirect("/projects");
  const [companies, curators] = await Promise.all([
    db.select({ id: externalCompanies.id, name: externalCompanies.name }).from(externalCompanies).where(eq(externalCompanies.status, "approved")).orderBy(externalCompanies.name),
    db.select({ id: users.id, fullName: users.fullName }).from(users).where(sql`${users.status}='active' AND ${users.position} in ('direktor','orinbosar','koordinator','bolim_boshligi')`).orderBy(users.fullName),
  ]);
  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>{t("projects.newTitle")}</CardTitle></CardHeader>
      <CardContent><NewProjectForm companies={companies} curators={curators} /></CardContent>
    </Card>
  );
}
