import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listProjectsForContractor } from "@/server/queries/projects";
import { ContractorProjectsView } from "@/components/contractor/contractor-projects-view";

export default async function ContractorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { company, projects } = await listProjectsForContractor(session.user.id, locale);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{company?.name ?? session.user.fullName}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t("contractor.dashboard.myProjects")}
          {company?.rating ? ` · ${t("contractor.dashboard.averageRating")}: ${company.rating}` : ""}
        </p>
      </div>
      <ContractorProjectsView projects={projects} />
    </div>
  );
}
