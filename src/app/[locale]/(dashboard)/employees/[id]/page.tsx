import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import {
  getEmployee,
  listEmployeeDocuments,
  listPositionHistory,
  listEmployeeLeaves,
} from "@/server/queries/employees";
import { Card } from "@/components/ui-biib/Card";
import { Heading } from "@/components/ui-biib/Heading";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { FactList } from "@/components/ui-biib/FactList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/ui/back-button";
import { ProfileForm } from "@/components/hr/profile-form";
import { DocumentsTab } from "@/components/hr/documents-tab";
import { ArchiveButton } from "@/components/hr/archive-button";
import { Button } from "@/components/ui/button";
import { ChangePositionDialog } from "@/components/hr/change-position-dialog";
import { db } from "@/lib/db";
import { departments as deptsTable, users as usersTable } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shortName } from "@/lib/names";
import { formatDate } from "@/lib/dates";
import { getLocale } from "next-intl/server";
import { AvatarUpload } from "@/components/hr/avatar-upload";
import { can } from "@/lib/permissions/capabilities";
import { getContactCard } from "@/server/queries/directory";

const STATUS_TONE: Record<string, StatusTone> = {
  active: "success",
  pending: "warning",
  archived: "neutral",
  blocked: "danger",
  approved: "success",
  rejected: "danger",
};

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const data = await getEmployee(id);
  if (!data) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  // Maxfiylik: hujjatlar, tarix va taʼtillar faqat HR rollari yoki xodimning oʻziga;
  // HR izohlari (notes_hr) — faqat HR rollariga.
  const isSelf = data.user.id === session.user.id;
  const isHr = can(session.user.position, "hr.documents");
  const canSeePrivate = isHr || isSelf;
  const [docs, history, leaves, contactCard] = await Promise.all([
    canSeePrivate ? listEmployeeDocuments(id) : [],
    canSeePrivate ? listPositionHistory(id) : [],
    canSeePrivate ? listEmployeeLeaves(id) : [],
    canSeePrivate ? null : getContactCard(id),
  ]);
  // Mobil raqam boshqa xodimlarga faqat kontakt kartada show_mobile yoqilgan boʻlsa koʻrinadi.
  const showPhone = canSeePrivate || contactCard?.showMobile === true;

  const canEdit = ["direktor", "orinbosar", "hr"].includes(session.user.position);
  const canArchive = ["direktor", "orinbosar", "hr"].includes(session.user.position);
  const canChangePosition = ["direktor", "orinbosar"].includes(session.user.position);

  const positionTitle = data.user.positionTitle ?? t(`positions.${data.user.position}`);
  const statusLabel = (s: string) => t(`status.${s}` as "status.active");

  const [deptOptions, managerOptions] = canChangePosition
    ? await Promise.all([
        db.select({ id: deptsTable.id, name: deptsTable.name }).from(deptsTable).orderBy(deptsTable.name),
        db
          .select({ id: usersTable.id, fullName: usersTable.fullName })
          .from(usersTable)
          .where(sql`${usersTable.position} in ('direktor','orinbosar','koordinator','bolim_boshligi','bosh_mutaxassis','yetakchi_mutaxassis') AND ${usersTable.status} = 'active' AND ${usersTable.hidden} = false`)
          .orderBy(usersTable.fullName),
      ])
    : [[], []];

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4">
        <BackButton fallbackHref="/employees" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <AvatarUpload
              userId={data.user.id}
              name={shortName(data.user.fullName)}
              avatarUrl={data.user.avatarUrl}
              canEdit={canEdit || data.user.id === session.user.id}
              department={data.department?.name}
              position={positionTitle}
            />
            <div className="min-w-0">
              <Heading level={1} trim className="min-w-0 break-words">{shortName(data.user.fullName)}</Heading>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="t-small text-[var(--ink-2)]">{positionTitle}</span>
                {data.department?.name && <span className="t-small text-[var(--ink-3)]">, {data.department.name}</span>}
                <Status tone={STATUS_TONE[data.user.status] ?? "neutral"}>{statusLabel(data.user.status)}</Status>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end">
            {canChangePosition && (
              <ChangePositionDialog
                userId={data.user.id}
                currentPosition={data.user.position}
                currentPositionTitle={data.user.positionTitle}
                currentDepartmentId={data.user.departmentId}
                departments={deptOptions}
                managers={managerOptions}
              />
            )}
            {canEdit && (
              <Button asChild variant="outline">
                <a href={`/api/export/employee-card/${data.user.id}`}>{t("employees.profile.printPdf")}</a>
              </Button>
            )}
            {canArchive && <ArchiveButton userId={data.user.id} status={data.user.status} />}
          </div>
        </div>
      </header>

      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main">{t("employees.tabs.main")}</TabsTrigger>
          {canSeePrivate && (
            <>
              <TabsTrigger value="docs">{t("employees.tabs.documents")}</TabsTrigger>
              <TabsTrigger value="history">{t("employees.tabs.history")}</TabsTrigger>
              <TabsTrigger value="leaves">{t("employees.tabs.leaves")}</TabsTrigger>
            </>
          )}
          {isHr && <TabsTrigger value="notes">{t("employees.tabs.notes")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="main">
          <Card solid>
            <h2 className="font-[family-name:var(--font-ui)] text-[1.1875rem] font-bold tracking-tight text-[var(--ink)]">
              {t("employees.profile.sectionTitle")}
            </h2>
            <FactList
              className="mt-4"
              items={[
                { term: t("common.email"), value: data.user.email },
                { term: t("common.phone"), value: showPhone ? data.user.phone ?? "—" : "—" },
                { term: t("employees.table.hireDate"), value: data.user.hireDate ?? "—" },
              ]}
            />
            {canEdit ? (
              <div className="mt-6 border-t border-[var(--line)] pt-6">
                <ProfileForm userId={data.user.id} profile={data.profile} />
              </div>
            ) : (
              <p className="mt-6 t-small text-[var(--ink-3)]">{t("employees.profile.viewOnly")}</p>
            )}
          </Card>
        </TabsContent>

        {canSeePrivate && (
          <>
            <TabsContent value="docs">
              <Card solid>
                <DocumentsTab userId={data.user.id} documents={docs.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))} canEdit={canEdit} />
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card solid bare className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>{t("employees.history.date")}</TableHead><TableHead>{t("employees.history.from")}</TableHead><TableHead>{t("employees.history.to")}</TableHead><TableHead>{t("employees.history.reason")}</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="tabular-nums text-[var(--ink-2)]">{formatDate(h.changeDate, locale)}</TableCell>
                        <TableCell className="text-[var(--ink-2)]">{h.oldPosition ? t(`positions.${h.oldPosition}` as `positions.direktor`) : "—"}</TableCell>
                        <TableCell className="text-[var(--ink)]">{t(`positions.${h.newPosition}` as `positions.direktor`)}</TableCell>
                        <TableCell className="text-[var(--ink-3)]">{h.reason ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {history.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-6 text-center text-[var(--ink-3)]">{t("employees.history.noHistory")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="leaves">
              <Card solid bare className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>{t("leaves.fields.type")}</TableHead><TableHead>{t("leaves.fields.start")}</TableHead><TableHead>{t("leaves.fields.end")}</TableHead><TableHead>{t("common.status")}</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-[var(--ink)]">{t(`leaves.types.${l.type}` as "leaves.types.vacation")}</TableCell>
                        <TableCell className="tabular-nums text-[var(--ink-2)]">{l.startDate}</TableCell>
                        <TableCell className="tabular-nums text-[var(--ink-2)]">{l.endDate}</TableCell>
                        <TableCell><Status tone={STATUS_TONE[l.status] ?? "warning"}>{statusLabel(l.status)}</Status></TableCell>
                      </TableRow>
                    ))}
                    {leaves.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-6 text-center text-[var(--ink-3)]">{t("leaves.none")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </>
        )}

        {isHr && (
          <TabsContent value="notes">
            <Card solid>
              <p className="mb-3 t-small text-[var(--ink-3)]">{t("employees.profile.notesNote")}</p>
              <div className="min-h-[120px] whitespace-pre-wrap rounded-[var(--radius-m)] bg-[var(--surface-2)] p-4 t-body text-[var(--ink)]">
                {data.profile?.notesHr || "—"}
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
