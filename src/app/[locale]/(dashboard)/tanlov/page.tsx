import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { listContests } from "@/server/queries/contests";
import { Card, CardContent } from "@/components/ui/card";
import { ContestCard } from "@/components/contests/contest-card";
import { ContestForm } from "@/components/contests/contest-form";

export const dynamic = "force-dynamic";

export default async function TanlovPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const canManage = canEditProjects(session.user.email);
  const contests = await listContests();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
            <Trophy className="size-6 shrink-0 text-[var(--warning)]" />
            {t("tanlov.title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("tanlov.subtitle")}</p>
        </div>
        {canManage && <div className="shrink-0"><ContestForm /></div>}
      </div>

      {contests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-[var(--warning-soft)] text-[var(--warning)]">
              <Trophy className="size-7" />
            </div>
            <p className="text-sm text-[var(--muted)]">{t("tanlov.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {contests.map((c) => (
            <ContestCard key={c.id} contest={c} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
