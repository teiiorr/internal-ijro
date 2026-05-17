import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { HrWidgets } from "@/components/dashboards/hr-widgets";
import { ManagerWidgets } from "@/components/dashboards/manager-widgets";
import { SpecialistWidgets } from "@/components/dashboards/specialist-widgets";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations();
  const user = session!.user;
  const isManager = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(user.position);
  const isHr = user.position === "hr";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{user.fullName}</h1>
        <p className="text-[var(--muted)]">{t(`positions.${user.position}`)}</p>
      </div>

      {isHr && <HrWidgets />}
      {isManager && <ManagerWidgets />}
      {!isManager && !isHr && <SpecialistWidgets userId={user.id} />}
    </div>
  );
}
