import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAudit } from "@/server/queries/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Link from "next/link";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = session.user;
  if (!["direktor", "orinbosar", "hr"].includes(me.position)) redirect("/dashboard");

  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const rows = await listAudit({
    userId: get("userId") ?? null,
    action: get("action") ?? null,
    entityType: get("entityType") ?? null,
    from: get("from") ?? null,
    to: get("to") ?? null,
    search: get("q") ?? null,
    scope: me.position === "hr" ? "hr" : "all",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit log</h1>
        <Button asChild variant="outline">
          <Link href={`/api/export/audit?${new URLSearchParams(sp as Record<string, string>).toString()}`}>
            <Download className="size-4" /> XLSX
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>IP</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{r.userName ?? "—"}</TableCell>
                  <TableCell><code className="text-xs">{r.action}</code></TableCell>
                  <TableCell className="text-xs text-[var(--muted)]">{r.entityType ?? "—"} {r.entityId ? r.entityId.slice(0, 8) : ""}</TableCell>
                  <TableCell className="text-xs">{r.ipAddress ?? "—"}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-[var(--muted)]">No log entries.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
