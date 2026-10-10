import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjectsForContractor } from "@/server/queries/projects";
import { ScrollMemory } from "@/components/scroll-memory";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { ContractorProjectsView } from "@/components/contractor/contractor-projects-view";

// Studiya loyihalari — muqova-toʻr koʻrinishi (holat tablari va qidiruv ichkarida).
export default async function ContractorProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { projects } = await listProjectsForContractor(session.user.id, locale);

  return (
    <div>
      <ScrollMemory />
      <PageHeader title={t("nav.projects")} />
      <ContractorProjectsView projects={projects} />
    </div>
  );
}
