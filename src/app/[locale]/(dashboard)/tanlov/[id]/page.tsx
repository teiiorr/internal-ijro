import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconUsers as Users, IconCalendar as CalendarDays } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { getContest } from "@/server/queries/contests";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
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

  const meta = (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-4" aria-hidden />
        {c.participantsCount} {t("tanlov.participantsShort")}
      </span>
      {c.heldAt && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-4" aria-hidden />
          {formatDate(c.heldAt, locale)}
        </span>
      )}
    </span>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={<BackButton fallbackHref="/tanlov" />}
        title={c.name}
        subtitle={meta}
        actions={
          canManage ? (
            <>
              <ContestForm contest={c} />
              <ContestDeleteButton contestId={c.id} contestName={c.name} />
            </>
          ) : undefined
        }
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        {/* Bosh galereya — vizual markaz. */}
        <ContestGallery contestId={c.id} photos={c.photos} canManage={canManage} />

        {/* Rasmiy natija. */}
        <Section title={t("tanlov.winner")} headingLevel={2}>
          <Card>
            <ContestReveal contestId={c.id} winnerName={winner} logoUrl={c.winnerLogoUrl} canManage={canManage} />
          </Card>
        </Section>

        {/* Tavsif — oʻqishga qulay matn koʻrinishida. */}
        {c.description && (
          <Section title={t("tanlov.about")} headingLevel={2}>
            <p className="max-w-2xl whitespace-pre-wrap break-words t-body leading-relaxed text-[var(--ink)]">{c.description}</p>
          </Section>
        )}

        {/* Muhokama + hujjatlar. */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <Card><ContestComments contestId={c.id} comments={c.comments} canModerate={canManage} /></Card>
          <Card><ContestFiles contestId={c.id} files={c.files} canManage={canManage} /></Card>
        </div>
      </div>
    </div>
  );
}
