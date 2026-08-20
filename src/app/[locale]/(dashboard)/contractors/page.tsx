import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listContractorsWithProjects } from "@/server/queries/projects";
import { CreateStudioButton } from "@/components/contractor/studio-crud-dialogs";
import { StudioGrid } from "@/components/contractor/studio-grid";

export default async function ContractorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const EXTRA_USERS = ["90956fa9-4892-4677-a31b-10af180e341a"];
  if (!["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(session.user.position) && !EXTRA_USERS.includes(session.user.id)) redirect("/dashboard");

  const rows = await listContractorsWithProjects();

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("contractors.pageTitle")}</h1>
        <CreateStudioButton />
      </div>

      <StudioGrid studios={rows.map((c) => ({ ...c, rating: c.rating as string | null }))} />
    </div>
  );
}
