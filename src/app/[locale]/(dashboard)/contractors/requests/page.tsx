import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { StageRequestsList } from "@/components/studio/stage-requests";
import { canViewContractorChats } from "@/lib/permissions/contractors";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { isOwner } from "@/lib/permissions/owner";
import { cn } from "@/lib/utils";
import { countPendingRequests, listStageRequests } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

// Xodimlar: studiyalardan kelgan barcha so'rovlar (muddatni uzaytirish + muammolar) bitta navbatda.
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

  const tab = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
      active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] hover:border-[var(--primary)]"
    );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/contractors" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("studio.staffQueue.title")}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("studio.staffQueue.subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/contractors/requests" className={tab(!showAll)}>
          {t("studio.staffQueue.pendingOnly")}
          <span className="rounded-full bg-black/10 px-1.5 text-xs tabular-nums">{pending}</span>
        </Link>
        <Link href="/contractors/requests?view=all" className={tab(showAll)}>{t("studio.staffQueue.all")}</Link>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {requests.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">{t("studio.staffQueue.empty")}</p>
          ) : (
            <StageRequestsList requests={requests} canDecide={canDecide} showProject linkBase="/projects" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
