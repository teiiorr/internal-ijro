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
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{company?.name ?? session.user.fullName}</h1>
        {company?.rating && <p className="text-sm text-[var(--muted)] mt-1">{t("contractor.dashboard.averageRating")}: ⭐ {company.rating}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-[var(--muted)] font-medium">{t("contractor.dashboard.activeProjects")}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-display font-bold tabular">{projects.filter((p) => p.status !== "completed").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-[var(--muted)] font-medium">{t("contractor.dashboard.completed")}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-display font-bold tabular">{projects.filter((p) => p.status === "completed").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-[var(--muted)] font-medium">{t("contractor.dashboard.total")}</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-display font-bold tabular">{projects.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("contractor.dashboard.myProjects")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/contractor/projects/${p.id}`} className="block rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] backdrop-blur-md p-4 hover:bg-[var(--surface-2)] transition-colors">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.deadline && <p className="text-xs text-[var(--muted)] mt-1">{t("tasks.deadline.deadlineLabel")}: {p.deadline}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={p.status === "completed" ? "success" : "default"}>{t(`status.${p.status}` as "status.planning")}</Badge>
                    <span className="text-sm font-semibold text-[var(--muted)] tabular">{p.progressPercentage}%</span>
                  </div>
                </div>
              </Link>
            ))}
            {projects.length === 0 && <p className="text-sm text-[var(--muted)] text-center py-6">{t("contractor.dashboard.noProjects")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
