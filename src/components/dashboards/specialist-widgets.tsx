import { getTranslations } from "next-intl/server";
import { getMyTasks } from "@/server/queries/dashboards";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";

export async function SpecialistWidgets({ userId }: { userId: string }) {
  const t = await getTranslations();
  const my = await getMyTasks(userId);
  const stats = [
    { label: t("dashboard.specialist.dueToday"), value: my.today, tone: "text-[var(--ink)]" },
    { label: t("dashboard.specialist.thisWeek"), value: my.week, tone: "text-[var(--ink)]" },
    { label: t("dashboard.specialist.soon"), value: my.soon, tone: "text-[var(--warning)]" },
    { label: t("dashboard.specialist.overdue"), value: my.overdue, tone: "text-[var(--danger)]" },
  ];
  return (
    <Section title={t("nav.myWork")} seeAllHref="/tasks?scope=mine" seeAllLabel={t("common.all")}>
      <Card>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className={`text-2xl font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</div>
              <div className="mt-1.5 t-small text-[var(--ink-3)]">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
}
