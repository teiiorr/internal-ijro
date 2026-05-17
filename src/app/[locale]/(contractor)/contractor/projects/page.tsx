import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listProjectsForContractor } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ContractorProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { projects } = await listProjectsForContractor(session.user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My projects</h1>
      <Card>
        <CardContent className="p-4 space-y-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/contractor/projects/${p.id}`} className="block border rounded-lg p-3 hover:bg-[var(--accent)]">
              <div className="flex justify-between">
                <p className="font-medium">{p.name}</p>
                <Badge variant={p.status === "completed" ? "success" : "default"}>{p.status}</Badge>
              </div>
            </Link>
          ))}
          {projects.length === 0 && <p className="text-sm text-[var(--muted)]">No projects.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
