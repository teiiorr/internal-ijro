import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HrWidgets } from "@/components/dashboards/hr-widgets";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations();
  const user = session!.user;

  const isHr = user.position === "hr" || user.position === "direktor" || user.position === "orinbosar";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{user.fullName}</h1>
        <p className="text-[var(--muted)]">{t(`positions.${user.position}`)}</p>
      </div>

      {isHr ? (
        <HrWidgets />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-lg">{t("nav.tasks")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">—</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">{t("nav.projects")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">—</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">{t("nav.notifications")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">0</p></CardContent></Card>
        </div>
      )}
    </div>
  );
}
