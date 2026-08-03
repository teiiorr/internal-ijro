import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Trophy, Users, Images } from "lucide-react";
import { auth } from "@/lib/auth";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { listContests } from "@/server/queries/contests";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {contests.map((c) => {
            const hero = c.photos[0];
            return (
              <Link
                key={c.id}
                href={`/tanlov/${c.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-1)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-2)]"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.fileUrl} alt={c.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid size-full place-items-center text-[var(--subtle)]"><Trophy className="size-12" /></div>
                  )}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                    <Users className="size-3.5" /> {c.participantsCount}
                  </span>
                  {c.photos.length > 1 && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      <Images className="size-3.5" /> {c.photos.length}
                    </span>
                  )}
                  {(c.winnerName || c.winnerProjectName) && (
                    <span className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#ffe17a] to-[#c9982a] text-base shadow-md">🏆</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h3 className="line-clamp-2 font-bold leading-snug">{c.name}</h3>
                  <p className="mt-auto pt-1 text-xs font-medium text-[var(--primary)] opacity-0 transition-opacity group-hover:opacity-100">
                    {t("tanlov.openDetail")} →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
