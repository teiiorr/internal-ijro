import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { departments, users } from "@/lib/db/schema";
import { InviteEmployeeForm } from "@/components/hr/invite-employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["direktor", "orinbosar", "hr"].includes(session.user.position)) redirect("/employees");

  const [dept, mgrs] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(departments.name),
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(sql`${users.position} in ('direktor','orinbosar','koordinator','bolim_boshligi','bosh_mutaxassis','yetakchi_mutaxassis') AND ${users.status} = 'active'`)
      .orderBy(users.fullName),
  ]);
  void eq;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Invite new employee</CardTitle>
      </CardHeader>
      <CardContent>
        <InviteEmployeeForm departments={dept} managers={mgrs} />
      </CardContent>
    </Card>
  );
}
