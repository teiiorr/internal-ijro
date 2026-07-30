import { auth } from "@/lib/auth";
import { getTranslations, getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { users, departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { localizeName } from "@/lib/names";
import { isOwner, OWNER_TITLE } from "@/lib/permissions/owner";
import { HrWidgets } from "@/components/dashboards/hr-widgets";
import { ManagerWidgets } from "@/components/dashboards/manager-widgets";
import { SpecialistWidgets } from "@/components/dashboards/specialist-widgets";
import { InboxWidget } from "@/components/dashboards/inbox-widget";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations();
  const locale = await getLocale();
  const user = session!.user;
  const isManager = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(user.position);
  const isHr = user.position === "hr";

  // Toshkent vaqti (UTC+5, yozgi vaqtsiz) bo'yicha salomlashuv.
  const hour = (new Date().getUTCHours() + 5) % 24;
  const greetKey = hour < 5 ? "night" : hour < 11 ? "morning" : hour < 18 ? "afternoon" : hour < 22 ? "evening" : "night";
  const greet = t(`dashboard.greeting.${greetKey}` as "dashboard.greeting.morning");
  const owner = isOwner(user.email);
  const [meRow] = await db
    .select({ positionTitle: users.positionTitle, deptName: departments.name })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.id, user.id))
    .limit(1);
  // Payments overview: director, anyone in the Finance (Moliya) department, and every department head.
  const showPayments =
    user.position === "direktor" ||
    user.position === "bolim_boshligi" ||
    /moliya/i.test(meRow?.deptName ?? "");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--muted)] font-medium mb-1">{greet},</p>
        <h1 className="font-bold tracking-tight text-xl sm:text-2xl md:text-3xl break-words">
          <span className="gradient-text">{localizeName(user.fullName, locale)}</span>
        </h1>
        {owner && (
          <p className="godfather-title mt-1.5 text-3xl leading-none sm:text-4xl md:text-5xl">
            {OWNER_TITLE}
          </p>
        )}
        <p className="text-[var(--muted)] mt-1 text-sm font-medium">
          {owner ? t("dashboard.ownerRole") : (meRow?.positionTitle ?? t(`positions.${user.position}` as "positions.direktor"))}
        </p>
      </div>

      <InboxWidget userId={user.id} />

      {/* Charts/graphs are visible to everyone now; payments overview is gated inside. */}
      <ManagerWidgets showPayments={showPayments} />

      {isHr && <HrWidgets />}
      {!isManager && !isHr && <SpecialistWidgets userId={user.id} />}
    </div>
  );
}
