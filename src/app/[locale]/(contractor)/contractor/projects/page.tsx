import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjectsForContractor } from "@/server/queries/projects";
import { ScrollMemory } from "@/components/scroll-memory";
import { ContractorProjectsView } from "@/components/contractor/contractor-projects-view";

export default async function ContractorProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { projects } = await listProjectsForContractor(session.user.id, locale);

  return (
    <div className="space-y-5 sm:space-y-6 stagger-children">
      <ScrollMemory />
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("contractor.dashboard.myProjects")}</h1>
      <ContractorProjectsView projects={projects} />
    </div>
  );
}
