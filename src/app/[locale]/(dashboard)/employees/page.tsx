import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listEmployees } from "@/server/queries/employees";
import { listDepartments } from "@/server/queries/departments";
import { Card } from "@/components/ui-biib/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui-biib/Button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { EmployeesFilterBar } from "@/components/hr/employees-filter-bar";
import { EmptyState } from "@/components/empty-state";
import { IconPlus as Plus, IconUsers } from "@tabler/icons-react";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";

type SP = Record<string, string | string[] | undefined>;

const STATUS_TONE: Record<string, StatusTone> = {
  active: "success",
  pending: "warning",
  archived: "neutral",
  blocked: "danger",
};

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
  const statusLabel = (s: string) => t(`status.${s}` as "status.active");

  return (
    <div>
      <PageHeader
        title={t("nav.employees")}
        subtitle={t("staffX.staffDirectory.members", { count: total })}
        actions={
          canAdd && (
            <Button asChild variant="primary" size="40" icon={Plus}>
              <Link href="/employees/new">{t("employees.addBtn")}</Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-6">
        <EmployeesFilterBar departments={departments.map((d) => ({ id: d.id, name: d.name }))} />

        {rows.length === 0 ? (
          <Card>
            <EmptyState icon={IconUsers} title={t("employees.empty")} />
          </Card>
        ) : (
          <>
            {/* Mobil: ajratuvchi-qatorli roʻyxat */}
            <Card bare className="px-5 sm:px-6 md:hidden">
              <Rows>
                {rows.map((r) => (
                  <Row key={r.id} href={`/employees/${r.id}`}>
                    <UserAvatar name={shortName(r.fullName)} avatarUrl={r.avatarUrl} size="sm" clickable={false} department={r.departmentName} position={r.positionTitle ?? r.position} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{shortName(r.fullName)}</p>
                      <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                        {r.positionTitle ?? t(`positions.${r.position}`)}
                        {r.departmentName ? `, ${r.departmentName}` : ""}
                      </p>
                    </div>
                    <Status tone={STATUS_TONE[r.status] ?? "neutral"}>{statusLabel(r.status)}</Status>
                  </Row>
                ))}
              </Rows>
            </Card>

            {/* Desktop: jadval (zich — qattiq sirt) */}
            <Card solid bare className="hidden overflow-hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("employees.table.name")}</TableHead>
                    <TableHead>{t("employees.table.email")}</TableHead>
                    <TableHead>{t("employees.table.position")}</TableHead>
                    <TableHead>{t("employees.table.department")}</TableHead>
                    <TableHead>{t("employees.table.status")}</TableHead>
                    <TableHead>{t("employees.table.hireDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/employees/${r.id}`} className="flex items-center gap-2.5 font-medium text-[var(--ink)] transition-colors hover:text-[var(--tint)]">
                          <UserAvatar name={shortName(r.fullName)} avatarUrl={r.avatarUrl} size="xs" clickable={false} department={r.departmentName} position={r.positionTitle ?? r.position} />
                          {shortName(r.fullName)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[var(--ink-3)]">{r.email}</TableCell>
                      <TableCell className="text-[var(--ink-2)]">{r.positionTitle ?? t(`positions.${r.position}`)}</TableCell>
                      <TableCell className="text-[var(--ink-2)]">{r.departmentName ?? "—"}</TableCell>
                      <TableCell>
                        <Status tone={STATUS_TONE[r.status] ?? "neutral"}>{statusLabel(r.status)}</Status>
                      </TableCell>
                      <TableCell className="tabular-nums text-[var(--ink-2)]">{r.hireDate ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
