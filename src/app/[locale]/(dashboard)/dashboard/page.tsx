import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { HrWidgets } from "@/components/dashboards/hr-widgets";
import { ManagerWidgets } from "@/components/dashboards/manager-widgets";
import { SpecialistWidgets } from "@/components/dashboards/specialist-widgets";
import { InboxWidget } from "@/components/dashboards/inbox-widget";

const DAY_NAMES_UZ = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations();
  const user = session!.user;
  const isManager = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(user.position);
  const isHr = user.position === "hr";

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? t("dashboard.greeting.morning") : hour < 18 ? t("dashboard.greeting.afternoon") : t("dashboard.greeting.evening");

  return (
    <div className="space-y-10">
      {/* Editorial hero — date eyebrow + greeting + name */}
      <div className="border-b-2 border-[var(--foreground)] pb-8">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
          <span className="eyebrow">
            № {String(now.getDate()).padStart(2, "0")} · {DAY_NAMES_UZ[now.getDay()]} · {now.getFullYear()}
          </span>
          <span className="eyebrow">{t(`positions.${user.position}` as "positions.direktor")}</span>
        </div>
        <h1 className="font-bold leading-[0.95] text-[clamp(2.25rem,5.5vw,4rem)] tracking-[-0.04em]">
          {greet},
          <span className="serif-italic block mt-1">{user.fullName.split(" ")[0]}.</span>
        </h1>
      </div>

      <InboxWidget userId={user.id} />

      {isHr && <HrWidgets />}
      {isManager && <ManagerWidgets />}
      {!isManager && !isHr && <SpecialistWidgets userId={user.id} />}
    </div>
  );
}
