import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listContractorsWithProjects } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { ContractorRow } from "@/components/projects/contractor-row";
import { CreateStudioButton } from "@/components/contractor/studio-crud-dialogs";

export default async function ContractorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const EXTRA_USERS = ["90956fa9-4892-4677-a31b-10af180e341a"];
  if (!["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(session.user.position) && !EXTRA_USERS.includes(session.user.id)) redirect("/dashboard");

  const rows = await listContractorsWithProjects();
  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("contractors.pageTitle")}</h1>
        <CreateStudioButton />
      </div>

      {pending.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="font-semibold text-lg">{t("contractors.pendingTitle")} ({pending.length})</h2>
            {pending.map((c) => (
              <ContractorRow key={c.id} c={{ ...c, rating: c.rating as string | null }} canManageLogo />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-semibold text-lg">{t("contractors.allTitle")}</h2>
          {others.map((c) => (
            <ContractorRow key={c.id} c={{ ...c, rating: c.rating as string | null }} canManageLogo />
          ))}
          {others.length === 0 && <p className="text-sm text-[var(--muted)]">{t("contractors.none")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
