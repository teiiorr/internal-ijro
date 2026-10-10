import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeCounts, getBirthdaysThisWeek } from "@/server/queries/employees";
import { listDepartments } from "@/server/queries/departments";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  IconUsers as Users,
  IconUserPlus as UserPlus,
  IconUserExclamation as UserPending,
  IconCake as Cake,
  IconBuilding as Building,
  IconChevronRight as ChevronRight,
  type Icon as TablerIcon,
} from "@tabler/icons-react";

function Kpi({ label, value, href, icon: Icon }: { label: string; value: number; href: string; icon: TablerIcon }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)]">
        <Icon className="size-5 text-[var(--primary)]" stroke={1.75} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none tabular-nums">{value}</div>
        <div className="mt-1 truncate text-xs font-medium text-[var(--muted)]">{label}</div>
      </div>
      <ChevronRight className="ml-auto size-4 shrink-0 text-[var(--subtle)] transition-colors group-hover:text-[var(--foreground)]" />
    </Link>
  );
}

export async function HrWidgets() {
  const t = await getTranslations();
  // Ta'tillar ishlatilmaydi ("мы не отдыхаем") — "hozir dam olishda" ko'rsatkichi olib tashlandi.
  const [counts, birthdays, depts] = await Promise.all([
    getEmployeeCounts(),
    getBirthdaysThisWeek(),
    listDepartments(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label={t("dashboard.hr.activeEmployees")} value={counts.total} href="/employees" icon={Users} />
        <Kpi label={t("dashboard.hr.newThisMonth")} value={counts.newThisMonth} href="/employees" icon={UserPlus} />
        <Kpi label={t("dashboard.hr.pendingInvites")} value={counts.pending} href="/employees?status=pending" icon={UserPending} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)]">
              <Cake className="size-5 text-[var(--primary)]" />
            </div>
            <CardTitle className="text-lg">{t("dashboard.hr.birthdays")}</CardTitle>
          </CardHeader>
          <CardContent>
            {birthdays.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted)]">{t("dashboard.hr.noBirthdays")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {birthdays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <Link href={`/employees/${b.id}`} className="inline-flex min-w-0 items-center gap-2 font-semibold hover:text-[var(--primary)]">
                      <UserAvatar name={b.fullName} avatarUrl={b.avatarUrl} size="xs" clickable={false} />
                      <span className="truncate">{shortName(b.fullName)}</span>
                    </Link>
                    <span className="shrink-0 tabular-nums text-[var(--muted)]">{b.birthDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)]">
              <Building className="size-5 text-[var(--primary)]" />
            </div>
            <CardTitle className="text-lg">{t("dashboard.hr.departments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {depts.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted)]">{t("dashboard.hr.noDepartments")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {depts.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{d.name}</span>
                    <span className="shrink-0 font-bold tabular-nums text-[var(--muted)]">{d.memberCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
