import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download } from "lucide-react";
import { can } from "@/lib/permissions";

const PROJECT_VIEW_ROLES = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"] as const;

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(PROJECT_VIEW_ROLES as readonly string[]).includes(session.user.position)) redirect("/dashboard");
  const t = await getTranslations();
  const rows = await listProjects({});
  const canCreate = can(session.user.position, "projects.create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t("projects.pageTitle")}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="default">
            <a href="/api/export/projects"><Download className="size-4" /> XLSX</a>
          </Button>
          {canCreate && (
            <Button asChild size="default">
              <Link href="/projects/new"><Plus className="size-4" /> {t("projects.new")}</Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>{t("projects.headers.name")}</TableHead><TableHead>{t("projects.headers.type")}</TableHead><TableHead>{t("projects.headers.curator")}</TableHead><TableHead>{t("projects.headers.company")}</TableHead><TableHead>{t("projects.headers.progress")}</TableHead><TableHead>{t("projects.headers.deadline")}</TableHead><TableHead>{t("projects.headers.status")}</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><Link href={`/projects/${p.id}`} className="font-semibold hover:text-[var(--primary)] transition-colors">{p.name}</Link></TableCell>
                  <TableCell>{t(`projects.type.${p.type}` as "projects.type.internal")}</TableCell>
                  <TableCell>{p.curatorName ?? t("common.emptyValue")}</TableCell>
                  <TableCell>{p.companyName ?? t("common.emptyValue")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--foreground)]" style={{ width: `${p.progressPercentage}%` }} />
                      </div>
                      <span className="text-xs font-semibold tabular w-8 text-right">{p.progressPercentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.deadline ?? t("common.emptyValue")}</TableCell>
                  <TableCell><Badge variant={p.status === "completed" ? "success" : p.status === "planning" ? "secondary" : "default"}>{t(`status.${p.status}` as "status.planning")}</Badge></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-[var(--muted)]">{t("projects.empty")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
