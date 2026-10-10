import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getMyTasks } from "@/server/queries/dashboards";
import {
  IconCalendarCheck as Today,
  IconCalendarWeek as Week,
  IconAlarm as Soon,
  IconCalendarX as Overdue,
  IconChevronRight as ChevronRight,
  type Icon as TablerIcon,
} from "@tabler/icons-react";

type Tone = "primary" | "warning" | "danger";
const TONE: Record<Tone, { chip: string; icon: string; value: string }> = {
  primary: { chip: "bg-[var(--primary-soft)]", icon: "text-[var(--primary)]", value: "" },
  warning: { chip: "bg-[var(--warning-soft)]", icon: "text-[var(--warning)]", value: "" },
  danger: { chip: "bg-[var(--danger-soft)]", icon: "text-[var(--danger)]", value: "text-[var(--danger)]" },
};

function Stat({ label, value, tone, href, icon: Icon }: { label: string; value: number; tone: Tone; href: string; icon: TablerIcon }) {
  const c = TONE[tone];
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]"
    >
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${c.chip}`}>
        <Icon className={`size-5 ${c.icon}`} stroke={1.75} />
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-extrabold leading-none tabular-nums ${c.value}`}>{value}</div>
        <div className="mt-1 truncate text-xs font-medium text-[var(--muted)]">{label}</div>
      </div>
      <ChevronRight className="ml-auto size-4 shrink-0 text-[var(--subtle)] transition-colors group-hover:text-[var(--foreground)]" />
    </Link>
  );
}

export async function SpecialistWidgets({ userId }: { userId: string }) {
  const t = await getTranslations();
  const my = await getMyTasks(userId);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label={t("dashboard.specialist.dueToday")} value={my.today} tone="primary" href="/tasks?scope=mine" icon={Today} />
      <Stat label={t("dashboard.specialist.thisWeek")} value={my.week} tone="primary" href="/tasks?scope=mine" icon={Week} />
      <Stat label={t("dashboard.specialist.soon")} value={my.soon} tone="warning" href="/tasks?scope=mine" icon={Soon} />
      <Stat label={t("dashboard.specialist.overdue")} value={my.overdue} tone="danger" href="/tasks?scope=mine" icon={Overdue} />
    </div>
  );
}
