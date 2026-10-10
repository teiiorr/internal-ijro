import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { timeAgo } from "@/lib/dates";
import { listContractorsWithProjects } from "@/server/queries/projects";
import { getReviewQueue } from "@/server/queries/stages";
import { CreateStudioButton } from "@/components/contractor/studio-crud-dialogs";
import { StudioGrid } from "@/components/contractor/studio-grid";
import { ReviewQueuePanel } from "@/components/contractor/review-queue-panel";
import { canViewContractorChats, isContractorManager } from "@/lib/permissions/contractors";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented } from "@/components/ui-biib/Segmented";
import { countPendingRequests } from "@/server/queries/studio";

export default async function ContractorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  if (!(await canViewContractorChats(session.user))) redirect("/dashboard");
  const canManage = isContractorManager(session.user);

  const [rows, reviewGroups, pendingRequests] = await Promise.all([listContractorsWithProjects(), getReviewQueue(), countPendingRequests()]);

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader
        title={t("contractors.pageTitle")}
        actions={canManage && <CreateStudioButton />}
        tools={
          <Segmented
            items={[
              { href: "/contractors", label: t("contractors.pageTitle"), active: true },
              {
                href: "/contractors/requests",
                active: false,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {t("studio.staffQueue.link")}
                    {pendingRequests > 0 && (
                      <span className="rounded-md bg-[var(--warning-soft)] px-1.5 text-[11px] font-bold tabular-nums text-[var(--warning)]">{pendingRequests}</span>
                    )}
                  </span>
                ),
              },
            ]}
          />
        }
      />

      {canManage && <ReviewQueuePanel groups={reviewGroups} />}

      <StudioGrid
        studios={rows.map((c) => ({
          ...c,
          rating: c.rating as string | null,
          lastOnlineLabel: c.lastLoginAt ? timeAgo(c.lastLoginAt, locale) : null,
        }))}
      />
    </div>
  );
}
