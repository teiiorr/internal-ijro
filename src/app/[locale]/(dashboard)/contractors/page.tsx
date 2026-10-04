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
import Link from "next/link";
import { IconMessageQuestion as Question } from "@tabler/icons-react";
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("contractors.pageTitle")}</h1>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Link
            href="/contractors/requests"
            className={`inline-flex h-9 items-center gap-1.5 rounded-2xl border px-3.5 text-sm font-semibold transition-colors ${pendingRequests > 0 ? "border-[#E08C10]/50 bg-[#E08C10]/10 text-[#B26E00] dark:text-[#F0A43A]" : "border-[var(--border)] hover:border-[var(--primary)]"}`}
          >
            <Question className="size-4" /> {t("studio.staffQueue.link")}
            {pendingRequests > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#E08C10] px-1.5 text-[11px] font-bold text-white tabular-nums">{pendingRequests}</span>}
          </Link>
          {canManage && <CreateStudioButton />}
        </div>
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
