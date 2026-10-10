import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { IconUsers as Users } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { listContests } from "@/server/queries/contests";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Card } from "@/components/ui-biib/Card";
import { Status } from "@/components/ui-biib/Status";
import { ContestForm } from "@/components/contests/contest-form";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TanlovPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const canManage = canEditProjects(session.user.email);
  const contests = await listContests();

  return (
    <div>
      <PageHeader title={t("tanlov.title")} actions={canManage ? <ContestForm /> : undefined} />

      {contests.length === 0 ? (
        <Card>
          <p className="py-10 text-center t-body text-[var(--ink-3)]">{t("tanlov.empty")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {contests.map((c) => {
            const hero = c.photos[0];
            const hasWinner = !!(c.winnerName || c.winnerProjectName);
            return (
              <Link
                key={c.id}
                href={`/tanlov/${c.id}`}
                className="group block rounded-[var(--radius-media)] border border-[var(--line)] p-2 transition-[transform,border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[var(--line-strong)]"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.fileUrl} alt={c.name} loading="lazy" decoding="async" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center bg-[var(--surface-2)]">
                      <span className="select-none text-5xl font-black text-[var(--ink-3)]">{c.name.trim().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[var(--radius-s)] bg-black/45 px-1.5 py-0.5 t-micro tabular-nums text-white backdrop-blur-sm">
                    <Users className="size-3" aria-hidden />{c.participantsCount}
                  </span>
                </div>
                <div className="space-y-1.5 px-1 pb-1 pt-2.5">
                  <p className="line-clamp-2 min-h-[2.75em] text-center text-sm font-medium leading-snug text-[var(--ink)]">{c.name}</p>
                  <div className="flex items-center justify-center gap-2">
                    {hasWinner ? (
                      <Status tone="success">{t("tanlov.winner")}</Status>
                    ) : (
                      <span className="truncate t-small text-[var(--ink-3)]">
                        {c.heldAt ? formatDate(c.heldAt, locale) : `${c.participantsCount} ${t("tanlov.participantsShort")}`}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
