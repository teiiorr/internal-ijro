import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjectsForContractor } from "@/server/queries/projects";
import { ScrollMemory } from "@/components/scroll-memory";
import { ContractorProjectsView } from "@/components/contractor/contractor-projects-view";

// Studiya bosh sahifasi = iş navbati. (Eski /contractor/dashboard ikkinchi navigatsiya
// bandi ortidagi aynan şu ekran edi; endi bu yerga yönaltiradi.)
export default async function ContractorProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { company, projects } = await listProjectsForContractor(session.user.id, locale);

  return (
    <div className="space-y-5 sm:space-y-6 stagger-children">
      <ScrollMemory />
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{company?.name ?? session.user.fullName}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("contractor.dashboard.myProjects")}</p>
      </div>
      <ContractorProjectsView projects={projects} />
    </div>
  );
}
