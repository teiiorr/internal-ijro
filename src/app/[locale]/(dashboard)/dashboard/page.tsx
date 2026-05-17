import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { HrWidgets } from "@/components/dashboards/hr-widgets";
import { ManagerWidgets } from "@/components/dashboards/manager-widgets";
import { SpecialistWidgets } from "@/components/dashboards/specialist-widgets";
import { InboxWidget } from "@/components/dashboards/inbox-widget";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations();
  const user = session!.user;
  const isManager = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(user.position);
  const isHr = user.position === "hr";

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Xayrli tong" : hour < 18 ? "Xayrli kun" : "Xayrli kech";

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="text-sm text-[var(--muted)] mb-1">{greet},</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{user.fullName}</h1>
        <p className="text-[var(--muted)] mt-1 text-sm sm:text-base">{t(`positions.${user.position}`)}</p>
      </div>

      <InboxWidget userId={user.id} />

      {isHr && <HrWidgets />}
      {isManager && <ManagerWidgets />}
      {!isManager && !isHr && <SpecialistWidgets userId={user.id} />}
    </div>
  );
}
