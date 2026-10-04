import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/** /reports → /reports/weekly (oxirgi tugagan hafta). Ruxsat reports/layout.tsx da. */
export default async function ReportsIndexPage() {
  const locale = (await getLocale()) as AppLocale;
  redirect({ href: "/reports/weekly", locale });
}
