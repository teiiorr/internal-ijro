import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { IconUsers as Users } from "@tabler/icons-react";
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
  const locale = await getLocale();
  const canManage = canEditProjects(session.user.email);
  const contests = await listContests();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <div className="hidden sm:block sm:flex-1" aria-hidden />
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("tanlov.title")}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("tanlov.subtitle")}</p>
        </div>
        <div className="flex justify-center sm:flex-1 sm:justify-end">
          {canManage && <ContestForm />}
        </div>
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
                className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow-1)] transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-2)]"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.fileUrl} alt={c.name} loading="lazy" decoding="async" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                      <span className="select-none text-5xl font-black text-[var(--subtle)]">{c.name.trim().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
                    <Users className="size-3" />{c.participantsCount}
                  </span>
                </div>
                <div className="space-y-2 px-1.5 pb-1 pt-2.5">
                  <p className="line-clamp-2 min-h-[2.75em] text-center text-sm font-semibold leading-snug">{c.name}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-[var(--muted)]">
                      {c.heldAt ? formatDate(c.heldAt, locale) : `${c.participantsCount} ${t("tanlov.participantsShort")}`}
                    </span>
                    <StatusTag tone={hasWinner ? "green" : "muted"} className="shrink-0">
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
