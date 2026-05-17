import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyTasks } from "@/server/queries/dashboards";
import { Button } from "@/components/ui/button";

export async function SpecialistWidgets({ userId }: { userId: string }) {
  const t = await getTranslations();
  const my = await getMyTasks(userId);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">{t("dashboard.specialist.dueToday")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{my.today}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">{t("dashboard.specialist.thisWeek")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{my.week}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">{t("dashboard.specialist.soon")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-[var(--warning)]">{my.soon}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-[var(--muted)]">{t("dashboard.specialist.overdue")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-[var(--danger)]">{my.overdue}</p></CardContent></Card>
      </div>
      <div className="flex gap-2">
        <Button asChild><Link href="/tasks?scope=mine">{t("dashboard.specialist.openMyTasks")}</Link></Button>
        <Button asChild variant="outline"><Link href="/reports/standup">{t("dashboard.specialist.submitStandup")}</Link></Button>
      </div>
    </div>
  );
}
