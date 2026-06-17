import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { getMyTasks } from "@/server/queries/dashboards";

type StatProps = { label: string; value: number; tone?: "default" | "warning" | "danger"; href: string };

function Stat({ label, value, tone = "default", href }: StatProps) {
  const color = tone === "warning" ? "text-[var(--warning)]" : tone === "danger" ? "text-[var(--danger)]" : "text-[var(--foreground)]";
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-[var(--glass-fill-strong)]">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
          <p className={`text-3xl font-bold tabular mt-1 ${color}`}>{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export async function SpecialistWidgets({ userId }: { userId: string }) {
  const t = await getTranslations();
  const my = await getMyTasks(userId);
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Stat label={t("dashboard.specialist.dueToday")} value={my.today} href="/tasks?scope=mine" />
      <Stat label={t("dashboard.specialist.thisWeek")} value={my.week}  href="/tasks?scope=mine" />
      <Stat label={t("dashboard.specialist.soon")}    value={my.soon}  tone="warning" href="/tasks?scope=mine" />
      <Stat label={t("dashboard.specialist.overdue")} value={my.overdue} tone="danger" href="/tasks?scope=mine" />
    </div>
  );
}
