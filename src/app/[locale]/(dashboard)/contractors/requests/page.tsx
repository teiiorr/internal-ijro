import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { StageRequestsList } from "@/components/studio/stage-requests";
import { canViewContractorChats } from "@/lib/permissions/contractors";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { isOwner } from "@/lib/permissions/owner";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented } from "@/components/ui-biib/Segmented";
import { Card } from "@/components/ui-biib/Card";
import { countPendingRequests, listStageRequests } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

// Xodimlar: studiyalardan kelgan barcha soʻrovlar (muddatni uzaytirish + muammolar) bitta navbatda.
export default async function StudioRequestsQueuePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await canViewContractorChats(session.user))) redirect("/dashboard");
  const t = await getTranslations();
  const { view } = await searchParams;
  const showAll = view === "all";
  const me = session.user;
  const canDecide = isOwner(me.email) || canEditProjects(me.email) || (await hasGrant(me.id, "projects.edit"));

  const [requests, pending] = await Promise.all([
    listStageRequests({ status: showAll ? undefined : "pending", limit: 200 }),
    countPendingRequests(),
  ]);

  return (
    <div>
      <PageHeader
        title={t("studio.staffQueue.title")}
        tools={
          <Segmented
            items={[
              { href: "/contractors", label: t("contractors.pageTitle"), active: false },
              {
                href: "/contractors/requests",
                active: true,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {t("studio.staffQueue.link")}
                    {pending > 0 && <span className="tabular-nums text-[var(--warning)]">{pending}</span>}
                  </span>
                ),
              },
            ]}
          />
        }
      />

      <div className="flex min-w-0 flex-col gap-5">
        <Segmented
          items={[
            {
              href: "/contractors/requests",
              active: !showAll,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {t("studio.staffQueue.pendingOnly")}
                  {pending > 0 && <span className="tabular-nums text-[var(--warning)]">{pending}</span>}
                </span>
              ),
            },
            { href: "/contractors/requests?view=all", active: showAll, label: t("studio.staffQueue.all") },
          ]}
        />

        {requests.length === 0 ? (
          <Card solid>
            <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("studio.staffQueue.empty")}</p>
          </Card>
        ) : (
          <Card solid className="px-5 sm:px-6">
            <StageRequestsList requests={requests} canDecide={canDecide} showProject linkBase="/projects" />
          </Card>
        )}
      </div>
    </div>
  );
}
