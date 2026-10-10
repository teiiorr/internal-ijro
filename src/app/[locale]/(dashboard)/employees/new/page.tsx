import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { departments, users } from "@/lib/db/schema";
import { InviteEmployeeForm } from "@/components/hr/invite-employee-form";
import { Card } from "@/components/ui-biib/Card";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { BackButton } from "@/components/ui/back-button";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  if (!["direktor", "orinbosar", "hr"].includes(session.user.position)) redirect("/employees");

  const [dept, mgrs] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(departments.name),
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(sql`${users.position} in ('direktor','orinbosar','koordinator','bolim_boshligi','bosh_mutaxassis','yetakchi_mutaxassis') AND ${users.status} = 'active' AND ${users.hidden} = false`)
      .orderBy(users.fullName),
  ]);
  void eq;

  return (
    <div>
      <PageHeader title={t("employees.newTitle")} back={<BackButton fallbackHref="/employees" />} />
      <Card solid className="max-w-2xl">
        <InviteEmployeeForm departments={dept} managers={mgrs} />
      </Card>
    </div>
  );
}
