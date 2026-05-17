import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeCounts, getBirthdaysThisWeek } from "@/server/queries/employees";
import { listDepartments } from "@/server/queries/departments";

export async function HrWidgets() {
  const t = await getTranslations();
  const [counts, birthdays, depts] = await Promise.all([
    getEmployeeCounts(),
    getBirthdaysThisWeek(),
    listDepartments(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t("dashboard.hr.activeEmployees"), value: counts.total, href: "/employees" },
          { label: t("dashboard.hr.newThisMonth"), value: counts.newThisMonth, href: "/employees" },
          { label: t("dashboard.hr.onLeave"), value: counts.onLeaveNow, href: "/employees" },
          { label: t("dashboard.hr.pendingInvites"), value: counts.pending, href: "/employees?status=pending" },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader><CardTitle className="text-sm text-[var(--muted)]">{c.label}</CardTitle></CardHeader>
            <CardContent>
              <Link href={c.href} className="text-3xl font-semibold hover:underline">{c.value}</Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("dashboard.hr.birthdays")}</CardTitle></CardHeader>
          <CardContent>
            {birthdays.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t("dashboard.hr.noBirthdays")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {birthdays.map((b) => (
                  <li key={b.id} className="flex justify-between">
                    <Link href={`/employees/${b.id}`} className="hover:underline">{b.fullName}</Link>
                    <span className="text-[var(--muted)]">{b.birthDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("dashboard.hr.departments")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {depts.slice(0, 8).map((d) => (
                <li key={d.id} className="flex justify-between">
                  <span>{d.name}</span>
                  <span className="text-[var(--muted)]">{d.memberCount}</span>
                </li>
              ))}
              {depts.length === 0 && <p className="text-sm text-[var(--muted)]">{t("dashboard.hr.noDepartments")}</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
