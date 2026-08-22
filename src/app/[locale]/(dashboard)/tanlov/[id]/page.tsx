import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { IconUsers as Users, IconCalendar as CalendarDays } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { getContest } from "@/server/queries/contests";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { ContestReveal } from "@/components/contests/contest-reveal";
import { ContestGallery } from "@/components/contests/contest-gallery";
import { ContestComments } from "@/components/contests/contest-comments";
import { ContestFiles } from "@/components/contests/contest-files";
import { ContestForm } from "@/components/contests/contest-form";
import { ContestDeleteButton } from "@/components/contests/contest-delete-button";

export const dynamic = "force-dynamic";

export default async function ContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;
  const c = await getContest(id);
  if (!c) notFound();
  const canManage = canEditProjects(session.user.email);
  const winner = c.winnerName || c.winnerProjectName || "";

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/tanlov" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-snug tracking-tight break-words sm:text-2xl">{c.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{c.participantsCount} {t("tanlov.participantsShort")}</span>
            {c.heldAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatDate(c.heldAt, locale)}</span>}
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <ContestForm contest={c} />
            <ContestDeleteButton contestId={c.id} />
          </div>
        )}
      </div>

      {/* winner reveal */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <ContestReveal contestId={c.id} contestName={c.name} winnerName={winner} logoUrl={c.winnerLogoUrl} canManage={canManage} />
        </CardContent>
      </Card>

      {/* gallery */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <ContestGallery contestId={c.id} photos={c.photos} canManage={canManage} />
        </CardContent>
      </Card>

      {/* description */}
      {c.description && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h3 className="mb-2 text-base font-semibold">{t("tanlov.about")}</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">{c.description}</p>
          </CardContent>
        </Card>
      )}

      {/* comments + files */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <Card><CardContent className="p-5 sm:p-6"><ContestComments contestId={c.id} comments={c.comments} canModerate={canManage} /></CardContent></Card>
        <Card><CardContent className="p-5 sm:p-6"><ContestFiles contestId={c.id} files={c.files} canManage={canManage} /></CardContent></Card>
      </div>
    </div>
  );
}
