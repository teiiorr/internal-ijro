import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import {
  getEmployee,
  listEmployeeDocuments,
  listPositionHistory,
  listEmployeeLeaves,
} from "@/server/queries/employees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/hr/profile-form";
import { DocumentsTab } from "@/components/hr/documents-tab";
import { ArchiveButton } from "@/components/hr/archive-button";
import { Button } from "@/components/ui/button";
import { ChangePositionDialog } from "@/components/hr/change-position-dialog";
import { db } from "@/lib/db";
import { departments as deptsTable, users as usersTable } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const data = await getEmployee(id);
  if (!data) notFound();

  const t = await getTranslations();
  const [docs, history, leaves] = await Promise.all([
    listEmployeeDocuments(id),
    listPositionHistory(id),
    listEmployeeLeaves(id),
  ]);

  const canEdit = ["direktor", "orinbosar", "hr"].includes(session.user.position);
  const canArchive = ["direktor", "orinbosar", "hr"].includes(session.user.position);
  const canChangePosition = ["direktor", "orinbosar"].includes(session.user.position);

  const [deptOptions, managerOptions] = canChangePosition
    ? await Promise.all([
        db.select({ id: deptsTable.id, name: deptsTable.name }).from(deptsTable).orderBy(deptsTable.name),
        db
          .select({ id: usersTable.id, fullName: usersTable.fullName })
          .from(usersTable)
          .where(sql`${usersTable.position} in ('direktor','orinbosar','koordinator','bolim_boshligi','bosh_mutaxassis','yetakchi_mutaxassis') AND ${usersTable.status} = 'active'`)
          .orderBy(usersTable.fullName),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{data.user.fullName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{t(`positions.${data.user.position}`)}</Badge>
            <span className="text-sm text-[var(--muted)]">{data.department?.name ?? "—"}</span>
            <Badge variant={data.user.status === "active" ? "success" : data.user.status === "pending" ? "warning" : "secondary"}>
              {data.user.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button asChild variant="outline">
              <a href={`/api/export/employee-card/${data.user.id}`}>{t("employees.profile.printPdf")}</a>
            </Button>
          )}
          {canChangePosition && (
            <ChangePositionDialog
              userId={data.user.id}
              currentPosition={data.user.position}
              currentDepartmentId={data.user.departmentId}
              departments={deptOptions}
              managers={managerOptions}
            />
          )}
          {canArchive && <ArchiveButton userId={data.user.id} status={data.user.status} />}
        </div>
      </div>

      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main">{t("employees.tabs.main")}</TabsTrigger>
          <TabsTrigger value="docs">{t("employees.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="history">{t("employees.tabs.history")}</TabsTrigger>
          <TabsTrigger value="leaves">{t("employees.tabs.leaves")}</TabsTrigger>
          <TabsTrigger value="notes">{t("employees.tabs.notes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="main">
          <Card>
            <CardHeader><CardTitle>{t("employees.profile.sectionTitle")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3 mb-6 text-sm">
                <div><span className="text-[var(--muted)]">{t("common.email")}:</span> {data.user.email}</div>
                <div><span className="text-[var(--muted)]">{t("common.phone")}:</span> {data.user.phone ?? "—"}</div>
                <div><span className="text-[var(--muted)]">{t("employees.table.hireDate")}:</span> {data.user.hireDate ?? "—"}</div>
              </div>
              {canEdit ? <ProfileForm userId={data.user.id} profile={data.profile} /> : <p className="text-sm text-[var(--muted)]">{t("employees.profile.viewOnly")}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardContent className="p-6">
              <DocumentsTab userId={data.user.id} documents={docs.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>{t("employees.history.date")}</TableHead><TableHead>{t("employees.history.from")}</TableHead><TableHead>{t("employees.history.to")}</TableHead><TableHead>{t("employees.history.reason")}</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{new Date(h.changeDate).toLocaleDateString()}</TableCell>
                      <TableCell>{h.oldPosition ? t(`positions.${h.oldPosition}` as `positions.direktor`) : "—"}</TableCell>
                      <TableCell>{t(`positions.${h.newPosition}` as `positions.direktor`)}</TableCell>
                      <TableCell className="text-[var(--muted)]">{h.reason ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-[var(--muted)] py-6">{t("employees.history.noHistory")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>{t("leaves.fields.type")}</TableHead><TableHead>{t("leaves.fields.start")}</TableHead><TableHead>{t("leaves.fields.end")}</TableHead><TableHead>{t("common.status")}</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.type}</TableCell>
                      <TableCell>{l.startDate}</TableCell>
                      <TableCell>{l.endDate}</TableCell>
                      <TableCell><Badge variant={l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"}>{l.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {leaves.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-[var(--muted)] py-6">{t("leaves.none")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-[var(--muted)] mb-3">{t("employees.profile.notesNote")}</p>
              <div className="whitespace-pre-wrap rounded-lg bg-[var(--secondary)] p-4 text-sm min-h-[120px]">
                {data.profile?.notesHr || "—"}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
