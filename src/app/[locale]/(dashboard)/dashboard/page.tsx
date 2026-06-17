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
  const greet = hour < 12 ? t("dashboard.greeting.morning") : hour < 18 ? t("dashboard.greeting.afternoon") : t("dashboard.greeting.evening");

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-3xl p-7 sm:p-8 relative overflow-hidden">
        <div aria-hidden className="orb orb-accent size-72 -top-20 -right-20 opacity-30" />
        <div className="relative">
          <p className="text-sm text-[var(--muted)] font-semibold mb-2">{greet},</p>
          <h1 className="font-extrabold tracking-[-0.03em] text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.05]">
            <span className="gradient-text">{user.fullName}</span>
          </h1>
          <p className="text-[var(--muted)] mt-2 text-sm sm:text-base font-medium">{t(`positions.${user.position}` as "positions.direktor")}</p>
        </div>
      </div>

      <InboxWidget userId={user.id} />

      {isHr && <HrWidgets />}
      {isManager && <ManagerWidgets />}
      {!isManager && !isHr && <SpecialistWidgets userId={user.id} />}
    </div>
  );
}
