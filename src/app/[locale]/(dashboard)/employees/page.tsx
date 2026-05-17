import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listEmployees } from "@/server/queries/employees";
import { listDepartments } from "@/server/queries/departments";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmployeesFilterBar } from "@/components/hr/employees-filter-bar";
import { Plus } from "lucide-react";

type SP = Record<string, string | string[] | undefined>;

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["direktor", "orinbosar", "hr", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis"].includes(session.user.position)) {
    redirect("/dashboard");
  }
  const t = await getTranslations();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const [{ rows, total }, departments] = await Promise.all([
    listEmployees({
      search: get("q"),
      departmentId: get("departmentId") ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      position: (get("position") as any) ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (get("status") as any) ?? null,
      limit: 100,
    }),
    listDepartments(),
  ]);

  const canAdd = ["direktor", "orinbosar", "hr"].includes(session.user.position);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("nav.employees")}</h1>
          <p className="text-sm text-[var(--muted)]">{total} {t("common.of")}</p>
        </div>
        {canAdd && (
          <Button asChild>
            <Link href="/employees/new"><Plus className="size-4" /> {t("common.submit")}</Link>
          </Button>
        )}
      </div>
      <EmployeesFilterBar departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/employees/${r.id}`} className="font-medium hover:underline">
                      {r.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[var(--muted)]">{r.email}</TableCell>
                  <TableCell>{t(`positions.${r.position}`)}</TableCell>
                  <TableCell>{r.departmentName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "active" ? "success" : r.status === "pending" ? "warning" : r.status === "archived" ? "secondary" : "danger"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.hireDate ?? "—"}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-[var(--muted)]">
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
