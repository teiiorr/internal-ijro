import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { isOwner } from "@/lib/permissions/owner";
import { canViewWeeklyBrief } from "@/lib/reports/weekly-brief-core";
import { ReportsTabs } from "@/components/staff/weekly-brief/reports-tabs";

/**
 * /reports boʻlimi: Haftalik brifing (/reports/weekly) va Muddat surilishi (/reports/slippage).
 * Kirish: direktor, oʻrinbosar, koordinator, boʻlim boshligʻi va platforma egasi —
 * qolganlar /dashboard ga qaytariladi (har bir sahifa ham oʻzi qayta tekshiradi).
 */
export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  if (!canViewWeeklyBrief(me.position, isOwner(me.email))) redirect("/dashboard");
  const [t, tNav] = await Promise.all([getTranslations("staffX.weeklyBrief"), getTranslations("nav")]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <ReportsTabs labels={{ nav: tNav("reports"), weekly: t("tabWeekly"), slippage: t("tabSlippage") }} />
      {children}
    </div>
  );
}
