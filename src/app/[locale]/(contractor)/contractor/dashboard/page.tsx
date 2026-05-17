import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listProjectsForContractor } from "@/server/queries/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ContractorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { company, projects } = await listProjectsForContractor(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{company?.name ?? session.user.fullName}</h1>
        {company?.rating && <p className="text-sm text-[var(--muted)]">{t("contractor.dashboard.averageRating")}: ⭐ {company.rating}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-[var(--muted)]">{t("contractor.dashboard.activeProjects")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{projects.filter((p) => p.status !== "completed").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-[var(--muted)]">{t("contractor.dashboard.completed")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{projects.filter((p) => p.status === "completed").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-[var(--muted)]">{t("contractor.dashboard.total")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{projects.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("contractor.dashboard.myProjects")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/contractor/projects/${p.id}`} className="block border rounded-lg p-3 hover:bg-[var(--accent)]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.deadline && <p className="text-xs text-[var(--muted)]">Due {p.deadline}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "completed" ? "success" : "default"}>{p.status}</Badge>
                    <span className="text-sm text-[var(--muted)]">{p.progressPercentage}%</span>
                  </div>
                </div>
              </Link>
            ))}
            {projects.length === 0 && <p className="text-sm text-[var(--muted)]">{t("contractor.dashboard.noProjects")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
