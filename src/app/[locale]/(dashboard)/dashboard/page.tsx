import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getTranslations, getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { users, departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { localizeName } from "@/lib/names";
import { isOwner } from "@/lib/permissions/owner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { HrWidgets } from "@/components/dashboards/hr-widgets";
import { ManagerWidgets } from "@/components/dashboards/manager-widgets";
import { SpecialistWidgets } from "@/components/dashboards/specialist-widgets";
import { ProjectStatusBoard } from "@/components/dashboards/project-status-board";
import { PinnedAnnouncementsBanner } from "@/components/staff/announcements/pinned-banner";
import { TodayStrip } from "@/components/staff/my-work/today-strip";
import { AckWidget } from "@/components/staff/normative-ack/ack-widget";

function SectionSkeleton() {
  return <div className="h-40 rounded-[var(--radius-card)] bg-[var(--surface-2)] animate-pulse" />;
}

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations();
  const locale = await getLocale();
  const user = session!.user;
  const isManager = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(user.position);
  const isHr = user.position === "hr";

  const owner = isOwner(user.email);
  const [meRow] = await db
    .select({ positionTitle: users.positionTitle, deptName: departments.name, avatarUrl: users.avatarUrl })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.id, user.id))
    .limit(1);
  const fullName = localizeName(user.fullName, locale);
  // "Ism Familiya, Boʻlim, Lavozim" — bitta qatorda, bir xil shrift (Manrope).
  const roleText = owner ? t("dashboard.ownerRole") : (meRow?.positionTitle ?? t(`positions.${user.position}` as "positions.direktor"));
  const subline = [meRow?.deptName, roleText].filter(Boolean).join(", ");
  const showPayments =
    user.position === "direktor" ||
    user.position === "bolim_boshligi" ||
    /moliya/i.test(meRow?.deptName ?? "");

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      {/* Profil: dumaloq foto + ism + "boʻlim, lavozim" — bitta qatorda, Manrope */}
      <header className="flex min-w-0 items-center gap-3">
        <UserAvatar name={fullName} avatarUrl={meRow?.avatarUrl} size="md" />
        <h1 className="min-w-0 truncate font-[family-name:var(--font-ui)] text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
          {fullName}
          {subline && <span className="font-medium text-[var(--ink-2)]">, {subline}</span>}
        </h1>
      </header>

      {/* Joriy holat — eng yuqorida (foydalanuvchi soʻrovi) */}
      <Suspense fallback={<SectionSkeleton />}>
        <ProjectStatusBoard />
      </Suspense>

      <Suspense fallback={null}>
        <PinnedAnnouncementsBanner userId={user.id} position={user.position} departmentId={user.departmentId} />
      </Suspense>

      {/* Bugun — "hozir nima qilaman": bitta ajratuvchi-qatorli roʻyxat */}
      <Suspense fallback={<SectionSkeleton />}>
        <TodayStrip userId={user.id} locale={locale} />
      </Suspense>

      <Suspense fallback={null}>
        <AckWidget userId={user.id} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <ManagerWidgets showPayments={showPayments} />
      </Suspense>

      {isHr && <Suspense fallback={<SectionSkeleton />}><HrWidgets /></Suspense>}
      {!isManager && !isHr && <Suspense fallback={<SectionSkeleton />}><SpecialistWidgets userId={user.id} /></Suspense>}
    </div>
  );
}
