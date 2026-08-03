import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { IconTrophy as Trophy, IconUsers as Users } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { listContests } from "@/server/queries/contests";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { ContestForm } from "@/components/contests/contest-form";
import { formatDate } from "@/lib/dates";

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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("tanlov.title")}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("tanlov.subtitle")}</p>
        </div>
        {canManage && <div className="shrink-0"><ContestForm /></div>}
      </div>

      {contests.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-[var(--muted)]">{t("tanlov.empty")}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {contests.map((c) => {
            const hero = c.photos[0];
            const hasWinner = !!(c.winnerName || c.winnerProjectName);
            return (
              <Link
                key={c.id}
                href={`/tanlov/${c.id}`}
                className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow-1)] transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:shadow-[var(--shadow-2)]"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.fileUrl} alt={c.name} className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                      <span className="select-none text-5xl font-black text-[var(--subtle)]">{c.name.trim().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
                    <Users className="size-3" />{c.participantsCount}
                  </span>
                  {hasWinner && (
                    <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] shadow-sm" title={t("tanlov.winner")}>
                      <Trophy className="size-4" />
                    </span>
                  )}
                </div>
                <div className="space-y-2 px-1.5 pb-1 pt-2.5">
                  <p className="line-clamp-2 min-h-[2.75em] text-center text-sm font-semibold leading-snug transition-colors duration-300 group-hover:text-[var(--primary-foreground)]">{c.name}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-[var(--muted)] transition-colors duration-300 group-hover:text-[var(--primary-foreground)] group-hover:opacity-80">
                      {c.heldAt ? formatDate(c.heldAt) : `${c.participantsCount} ${t("tanlov.participantsShort")}`}
                    </span>
                    <StatusTag
                      tone={hasWinner ? "green" : "muted"}
                      className="shrink-0 transition-all duration-300 group-hover:border-transparent group-hover:bg-[var(--primary-foreground)] group-hover:text-[var(--primary)]"
                    >
                      {hasWinner ? t("tanlov.winner") : t("tanlov.pending")}
                    </StatusTag>
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
