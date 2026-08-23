import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconUsers as Users, IconCalendar as CalendarDays } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { getContest } from "@/server/queries/contests";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto max-w-5xl stagger-children">
      {/* Toolbar: navigation + owner actions on their own row. */}
      <div className="flex items-center justify-between gap-2">
        <BackButton fallbackHref="/tanlov" />
        {canManage && (
          <div className="flex items-center gap-2">
            <ContestForm contest={c} />
            <ContestDeleteButton contestId={c.id} />
          </div>
        )}
      </div>

      {/* Masthead — the contest title leads. */}
      <header className="mt-5 text-center">
        <h1 className="mx-auto max-w-3xl text-2xl font-bold leading-tight tracking-tight break-words sm:text-3xl md:text-4xl">{c.name}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{c.participantsCount} {t("tanlov.participantsShort")}</span>
          {c.heldAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatDate(c.heldAt, locale)}</span>}
        </div>
      </header>

      {/* Hero gallery — the visual anchor. */}
      <div className="mt-6">
        <ContestGallery contestId={c.id} photos={c.photos} canManage={canManage} />
      </div>

      {/* Official result. */}
      <div className="mt-6">
        <ContestReveal contestId={c.id} contestName={c.name} winnerName={winner} logoUrl={c.winnerLogoUrl} canManage={canManage} />
      </div>

      {/* Description as readable prose. */}
      {c.description && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">{t("tanlov.about")}</h2>
          <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--foreground)]">{c.description}</p>
        </section>
      )}

      {/* Discussion + documents. */}
      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-5 sm:p-6"><ContestComments contestId={c.id} comments={c.comments} canModerate={canManage} /></CardContent></Card>
        <Card><CardContent className="p-5 sm:p-6"><ContestFiles contestId={c.id} files={c.files} canManage={canManage} /></CardContent></Card>
      </div>
    </div>
  );
}
