import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { can } from "@/lib/permissions";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rows = await listProjects({});
  const canCreate = can(session.user.position, "projects.create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        {canCreate && (
          <Button asChild>
            <Link href="/projects/new"><Plus className="size-4" /> New project</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Curator</TableHead><TableHead>Company</TableHead><TableHead>Progress</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link></TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{p.curatorName ?? "—"}</TableCell>
                  <TableCell>{p.companyName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--secondary)] rounded">
                        <div className="h-full bg-[var(--primary)] rounded" style={{ width: `${p.progressPercentage}%` }} />
                      </div>
                      <span className="text-xs w-8">{p.progressPercentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.deadline ?? "—"}</TableCell>
                  <TableCell><Badge variant={p.status === "completed" ? "success" : p.status === "planning" ? "secondary" : "default"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-[var(--muted)]">No projects</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
