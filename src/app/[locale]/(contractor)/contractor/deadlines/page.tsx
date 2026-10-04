import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { IconChevronRight as Chevron } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { DeadlineChip } from "@/components/studio/deadline-chip";
import { daysFromToday, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getStudioCompany, getStudioDeadlines } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

// Studiya: yakunlanmagan bosqichlarning muddatlari — eng yaqini birinchi.
export default async function StudioDeadlinesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const company = await getStudioCompany(session.user.email);
  if (!company) notFound();

  const rows = (await getStudioDeadlines(company.id)).map((r) => ({ ...r, days: daysFromToday(r.deadline) }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("studio.deadlines.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("studio.deadlines.subtitle")}</p>
      </header>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="py-14 text-center text-sm text-[var(--muted)]">{t("studio.deadlines.empty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <li key={r.stageId}>
                  <Link
                    href={`/contractor/projects/${r.projectId}/stages/${r.stageId}`}
                    className={cn("flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[var(--glass-fill)] sm:px-5", r.days < 0 && "bg-[#E02424]/[0.04]")}
                  >
                    <div className="grid w-14 shrink-0 place-items-center rounded-2xl border border-[var(--border)] py-1.5 text-center">
                      <span className="text-lg font-extrabold leading-none tabular-nums">{r.deadline.slice(8, 10)}</span>
                      <span className="mt-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">{formatDate(r.deadline, locale).replace(/^\d+\s*/, "").slice(0, 6)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold">{r.stageOrder + 1}. {r.stageName}</p>
                      <p className="break-words text-xs text-[var(--muted)]">
                        {r.projectName} · {r.status === "active" ? t("studio.deadlines.active") : t("studio.deadlines.locked")}
                      </p>
                    </div>
                    <DeadlineChip days={r.days} />
                    <Chevron className="size-4 shrink-0 text-[var(--subtle)]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
