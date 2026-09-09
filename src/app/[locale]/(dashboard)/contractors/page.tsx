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

export default async function ContractorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  if (!(await canViewContractorChats(session.user))) redirect("/dashboard");
  const canManage = isContractorManager(session.user);

  const [rows, reviewGroups] = await Promise.all([listContractorsWithProjects(), getReviewQueue()]);

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("contractors.pageTitle")}</h1>
        {canManage && <CreateStudioButton />}
      </div>

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
