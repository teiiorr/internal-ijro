import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { listDepartments } from "@/server/queries/departments";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { DepartmentsManager } from "@/components/hr/departments-manager";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  if (!["direktor", "orinbosar"].includes(session.user.position)) redirect("/dashboard");

  const [depts, managers] = await Promise.all([
    listDepartments(),
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(sql`${users.position} in ('direktor','orinbosar','koordinator','bolim_boshligi') AND ${users.status} = 'active' AND ${users.hidden} = false`)
      .orderBy(users.fullName),
  ]);

  return (
    <div>
      <PageHeader title={t("departments.pageTitle")} />
      <DepartmentsManager departments={depts} managers={managers} />
    </div>
  );
}
