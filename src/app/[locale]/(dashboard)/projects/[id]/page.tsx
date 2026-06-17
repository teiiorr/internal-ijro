import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getProject } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StagesList } from "@/components/projects/stages-list";
import { DeliverablesList } from "@/components/projects/deliverables-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { OnHoldToggle } from "@/components/projects/on-hold-toggle";
import { derivedStatus } from "@/lib/projects/progress";
import { formatDate } from "@/lib/dates";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { id } = await params;
  const data = await getProject(id);
  if (!data) notFound();
  const me = session.user;
  const canManage = ["direktor", "orinbosar", "koordinator"].includes(me.position) || data.project.curatorUserId === me.id;
  const canTogglePayment = ["direktor", "orinbosar"].includes(me.position);

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
        {canManage && (
          <OnHoldToggle
            projectId={data.project.id}
            onHold={data.project.statusOverride === "on_hold"}
          />
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
          <StagesList projectId={data.project.id} items={stages} canManage={canManage} />
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
