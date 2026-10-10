import { getTranslations } from "next-intl/server";
import { getEmployeeCounts, getBirthdaysThisWeek } from "@/server/queries/employees";
import { listDepartments } from "@/server/queries/departments";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";

export async function HrWidgets() {
  const t = await getTranslations();
  // Taʼtillar ishlatilmaydi ("мы не отдыхаем") — "hozir dam olishda" olib tashlangan.
  const [counts, birthdays, depts] = await Promise.all([
    getEmployeeCounts(),
    getBirthdaysThisWeek(),
    listDepartments(),
  ]);

  const stats = [
    { label: t("dashboard.hr.activeEmployees"), value: counts.total },
    { label: t("dashboard.hr.newThisMonth"), value: counts.newThisMonth },
    { label: t("dashboard.hr.pendingInvites"), value: counts.pending },
  ];

  return (
    <>
      <Section title={t("nav.employees")} seeAllHref="/employees" seeAllLabel={t("common.all")}>
        <Card>
          <div className="grid grid-cols-3 gap-x-6">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold leading-none tabular-nums text-[var(--ink)]">{s.value}</div>
                <div className="mt-1.5 t-small text-[var(--ink-3)]">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <Section title={t("dashboard.hr.birthdays")}>
          <Card bare className="px-5 sm:px-6">
            {birthdays.length === 0 ? (
              <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("dashboard.hr.noBirthdays")}</p>
            ) : (
              <Rows>
                {birthdays.map((b) => (
                  <Row key={b.id} href={`/employees/${b.id}`}>
                    <UserAvatar name={b.fullName} avatarUrl={b.avatarUrl} size="xs" clickable={false} />
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium text-[var(--ink)]">{shortName(b.fullName)}</span>
                    <span className="shrink-0 t-small tabular-nums text-[var(--ink-3)]">{b.birthDate}</span>
                  </Row>
                ))}
              </Rows>
            )}
          </Card>
        </Section>

        <Section title={t("dashboard.hr.departments")}>
          <Card bare className="px-5 sm:px-6">
            {depts.length === 0 ? (
              <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("dashboard.hr.noDepartments")}</p>
            ) : (
              <Rows>
                {depts.slice(0, 8).map((d) => (
                  <Row key={d.id}>
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-[var(--ink)]">{d.name}</span>
                    <span className="shrink-0 font-bold tabular-nums text-[var(--ink-3)]">{d.memberCount}</span>
                  </Row>
                ))}
              </Rows>
            )}
          </Card>
        </Section>
      </div>
    </>
  );
}
