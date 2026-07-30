import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { auth } from "@/lib/auth";
import { getProject, listContractors } from "@/server/queries/projects";
import { getStageProject } from "@/server/queries/stages";
import { ProjectContractor } from "@/components/projects/project-contractor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StagesList } from "@/components/projects/stages-list";
import { StagePath } from "@/components/projects/stage-path";
import { ProjectPoster } from "@/components/projects/project-poster";
import { ProjectDocsPanels } from "@/components/projects/project-docs-panels";
import { PaymentDocuments } from "@/components/projects/payment-documents";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import { derivedStatus } from "@/lib/projects/progress";
import { canEditProjects, canViewMoney, MONEY_MASK } from "@/lib/permissions/project-editors";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// Amounts are rendered inside whitespace-nowrap containers so "… UZS" never breaks onto its own line.
const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;
  const data = await getProject(id);
  if (!data) notFound();
  const me = session.user;
  // Curator picker options for the edit dialog (all active internal staff).
  const curatorOptions = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(sql`${users.status}='active' AND ${users.position} <> 'kontragent'`)
    .orderBy(users.fullName);
  const editProject = {
    id: data.project.id,
    name: data.project.name,
    description: data.project.description,
    type: data.project.type,
    curatorUserId: data.project.curatorUserId,
    startDate: data.project.startDate,
    deadline: data.project.deadline,
    budget: data.project.budget,
    budgetCurrency: data.project.budgetCurrency,
  };
  // Project changes are restricted to the fixed project-editor allowlist; everyone else is read-only.
  const editor = canEditProjects(me.email);
  const canManage = editor;
  const canDelete = editor;
  // Deleting a whole project is irreversible → editor + senior management only.
  const canDeleteProject = editor && ["direktor", "orinbosar", "koordinator"].includes(me.position);
  const canTogglePayment = editor;
  // Budgets & payment sums are visible only to the money allowlist; others see ***.
  const showMoney = canViewMoney(me.email);

  // ---- Typed (template-driven) project → serpentine stage view ----
  if (data.project.projectTypeId) {
    const sp = await getStageProject(id, locale);
    if (!sp) notFound();
    const contractors = await listContractors("approved");
    const canManageContractor = editor;
    const status = derivedStatus(sp.project.progressPercentage, sp.project.statusOverride);
    const statusTone: StatusTone =
      status === "completed" ? "green"
      : status === "in_progress" ? "amber"
      : status === "on_hold" ? "red"
      : "muted";
    const activeStage = sp.stages.find((s) => s.status === "active");
    const currency = sp.project.budgetCurrency ?? "UZS";

    return (
      <div className="space-y-6">
        {/* header (full width) */}
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon-sm" className="mt-0.5 shrink-0">
            <Link href="/projects"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug break-words">{sp.project.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
              <StatusTag tone={statusTone}>{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</StatusTag>
              {sp.type && <span className="font-medium text-[var(--muted)]">{sp.type.name}</span>}
              <span className="font-semibold tabular-nums text-[var(--muted)]">{sp.project.progressPercentage}%</span>
              {sp.curator && (
                <span className="text-[var(--muted)]">
                  {t("projects.curatorLabel")}: <span className="font-medium text-[var(--foreground)]">{sp.curator.fullName}</span>
                </span>
              )}
            </div>
          </div>
          {(canManage || canDeleteProject) && (
            <div className="shrink-0">
              <ProjectActionsMenu
                project={editProject}
                curators={curatorOptions}
                canManage={canManage}
                canDelete={canDeleteProject}
                // Show "mark in progress" on every not-started project (0% + no override), and on
                // ones already manually marked (so they can be un-marked).
                showInProgress={canManage && sp.project.statusOverride !== "on_hold" && (sp.project.progressPercentage === 0 || sp.project.statusOverride === "in_progress")}
                onHold={sp.project.statusOverride === "on_hold"}
                inProgress={sp.project.statusOverride === "in_progress"}
              />
            </div>
          )}
        </div>

        {sp.project.description && (
          <Card><CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">{sp.project.description}</CardContent></Card>
        )}

        {/* Details entered at creation — dates + budget (now visible, editable via the pencil) */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h3 className="text-base font-semibold mb-4">{t("projects.details.title")}</h3>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.startDate")}</dt>
                <dd className="font-semibold mt-0.5">{sp.project.startDate ? formatDate(sp.project.startDate) : t("common.emptyValue")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.dueDate")}</dt>
                <dd className="font-semibold mt-0.5">{sp.project.deadline ? formatDate(sp.project.deadline) : t("common.emptyValue")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.budget")}</dt>
                <dd className="font-semibold mt-0.5 tabular-nums whitespace-nowrap">{sp.project.budget != null ? (showMoney ? money(Number(sp.project.budget), currency) : MONEY_MASK) : t("common.emptyValue")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.curatorLabel")}</dt>
                <dd className="font-semibold mt-0.5">{sp.curator?.fullName ?? t("common.emptyValue")}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* stage list (main) + payment rollup (sidebar) — fills the full width */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <h3 className="text-base font-semibold mb-4">{t("projects.stagePath.title")}</h3>
                <StagePath projectId={sp.project.id} stages={sp.stages} />
              </CardContent>
            </Card>

            {/* Project-level document buckets — fills the space under the stages. */}
            <ProjectDocsPanels
              projectId={sp.project.id}
              canManage={canManage}
              maxBytes={MAX_UPLOAD_BYTES}
              tahlil={sp.documents.tahlil.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))}
              xalqaro={sp.documents.xalqaro_tajriba.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))}
            />
          </div>

          <div className="space-y-6">
            <ProjectPoster projectId={sp.project.id} posterUrl={sp.project.posterUrl} name={sp.project.name} canManage={canManage} />
            <Card>
              <CardContent className="p-5">
                <ProjectContractor
                  projectId={sp.project.id}
                  company={sp.company}
                  contractors={contractors.map((c) => ({ id: c.id, name: c.name }))}
                  canManage={canManageContractor}
                />
              </CardContent>
            </Card>
            <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-base font-semibold">{t("projects.stagePayments.projectTotal")}</h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <dt className="text-[var(--muted)]">{t("projects.stagePayments.planned")}</dt>
                  <dd className="ml-auto whitespace-nowrap font-semibold tabular-nums">{showMoney ? money(sp.totals.planned, currency) : MONEY_MASK}</dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <dt className="text-[var(--muted)]">{t("projects.stagePayments.paid")}</dt>
                  <dd className="ml-auto whitespace-nowrap font-semibold tabular-nums text-[var(--success)]">{showMoney ? money(sp.totals.paid, currency) : MONEY_MASK}</dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <dt className="text-[var(--muted)]">{t("projects.stagePayments.pending")}</dt>
                  <dd className="ml-auto whitespace-nowrap font-semibold tabular-nums text-[var(--warning)]">{showMoney ? money(sp.totals.pending, currency) : MONEY_MASK}</dd>
                </div>
              </dl>
              {activeStage && (
                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                  <p className="text-sm text-[var(--muted)]">
                    {t("projects.stagePath.currentStage")}: <span className="font-medium text-[var(--foreground)]">{activeStage.name}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <CalendarClock className="size-3.5 shrink-0 text-[var(--muted)]" />
                    <span className={`font-medium ${activeStage.plannedDeadline ? "" : "text-[var(--muted)]"}`}>
                      {activeStage.plannedDeadline ? formatDate(activeStage.plannedDeadline) : t("projects.stageDeadline.notSet")}
                    </span>
                    {activeStage.plannedDeadline && <DeadlineCountdown deadline={activeStage.plannedDeadline} />}
                  </div>
                </div>
              )}
            </CardContent>
            </Card>

            {/* Payment documents (receipts / invoices) — money allowlist only, right under the totals. */}
            {showMoney && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-semibold">{t("projects.paymentDocs.title")}</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{t("projects.paymentDocs.hint")}</p>
                  </div>
                  <PaymentDocuments
                    projectId={sp.project.id}
                    documents={sp.documents.payment.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))}
                    canManage={canManage}
                    maxBytes={MAX_UPLOAD_BYTES}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  const stages = data.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    weight: m.weight,
    progress: m.progress,
    orderIndex: m.orderIndex,
    deadline: m.deadline,
  }));

  const status = derivedStatus(data.project.progressPercentage, data.project.statusOverride);
  const statusVariant =
    status === "completed" ? "success"
    : status === "on_hold" ? "warning"
    : status === "in_progress" ? "default"
    : "secondary";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start gap-2 flex-wrap">
        <Button asChild variant="ghost" size="icon-sm" className="mt-0.5 shrink-0">
          <Link href="/projects"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug break-words">{data.project.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap text-sm">
            <Badge variant={statusVariant}>{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</Badge>
            <Badge variant="secondary">{t(`projects.type.${data.project.type}` as "projects.type.internal")}</Badge>
            {data.curator && (
              <span className="text-[var(--muted)]">
                {t("projects.curatorLabel")}: <span className="font-medium text-[var(--foreground)]">{data.curator.fullName}</span>
              </span>
            )}
            {data.company && (
              <span className="text-[var(--muted)]">
                {t("projects.contractorLabel")}:{" "}
                <Link href="/contractors" className="hover:underline text-[var(--primary)] font-medium">{data.company.name}</Link>
              </span>
            )}
          </div>
        </div>
        {(canManage || canDeleteProject) && (
          <div className="shrink-0">
            <ProjectActionsMenu
              project={editProject}
              curators={curatorOptions}
              canManage={canManage}
              canDelete={canDeleteProject}
              showInProgress={canManage && data.project.statusOverride !== "on_hold" && (data.project.progressPercentage === 0 || data.project.statusOverride === "in_progress")}
              onHold={data.project.statusOverride === "on_hold"}
              inProgress={data.project.statusOverride === "in_progress"}
            />
          </div>
        )}
      </div>

      {data.project.description && (
        <Card>
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {data.project.description}
          </CardContent>
        </Card>
      )}

      {/* 1. Umumiy bajarilish + Bosqichlar */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <StagesList projectId={data.project.id} items={stages} canManage={canManage} canDelete={canDelete} />
        </CardContent>
      </Card>

      {/* 2. Hujjatlar */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold">{t("projects.documents.title")}</h3>
          <DeliverablesList
            projectId={data.project.id}
            items={data.deliverables.map((d) => ({ ...d, submittedAt: d.submittedAt as Date }))}
            milestones={stages.map((s) => ({ id: s.id, title: s.title }))}
            canSubmit={me.position === "kontragent" || canManage}
            canReview={canManage}
          />
        </CardContent>
      </Card>

      {/* 3. Tafsilotlar */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold">{t("projects.details.title")}</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.curatorLabel")}</dt>
              <dd className="font-medium mt-0.5">{data.curator?.fullName ?? t("common.emptyValue")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("common.status")}</dt>
              <dd className="font-medium mt-0.5">{t(`projects.derivedStatus.${status}` as "projects.derivedStatus.in_progress")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.startDate")}</dt>
              <dd className="font-medium mt-0.5">{data.project.startDate ? formatDate(data.project.startDate) : t("common.emptyValue")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.dueDate")}</dt>
              <dd className="font-medium mt-0.5">{data.project.deadline ? formatDate(data.project.deadline) : t("common.emptyValue")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">{t("projects.details.budget")}</dt>
              <dd className="font-medium mt-0.5 tabular-nums whitespace-nowrap">{data.project.budget != null ? (showMoney ? money(Number(data.project.budget), data.project.budgetCurrency) : MONEY_MASK) : t("common.emptyValue")}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 4. Chat (only for external/company projects) */}
      {data.company && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("projects.tabs.chat")}</h3>
            <ProjectChat
              projectId={data.project.id}
              messages={data.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))}
            />
          </CardContent>
        </Card>
      )}

      {/* unused parameter satisfied */}
      <span className="hidden">{canTogglePayment ? "" : ""}</span>
    </div>
  );
}
