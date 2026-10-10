import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui-biib/Card";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
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

  const rows = await getStudioDeadlines(company.id);

  return (
    <div>
      <PageHeader title={t("studio.deadlines.title")} />
      <Card bare className="px-5 sm:px-6">
        {rows.length === 0 ? (
          <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("studio.deadlines.empty")}</p>
        ) : (
          <Rows>
            {rows.map((r) => {
              // Oyning qisqa nomi — vaqt mintaqasidan mustaqil (UTC).
              const d = new Date(`${r.deadline.slice(0, 10)}T00:00:00Z`);
              const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(d);
              return (
                <Row key={r.stageId} href={`/contractor/projects/${r.projectId}/stages/${r.stageId}`}>
                  <div className="w-10 shrink-0 text-center">
                    <div className="text-lg font-bold leading-none tabular-nums text-[var(--ink)]">{r.deadline.slice(8, 10)}</div>
                    <div className="mt-0.5 t-micro uppercase text-[var(--ink-3)]">{month}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{r.stageOrder + 1}. {r.stageName}</p>
                    <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                      {r.projectName}, {r.status === "active" ? t("studio.deadlines.active") : t("studio.deadlines.locked")}
                    </p>
                  </div>
                  <DeadlineCountdown deadline={r.deadline} />
                </Row>
              );
            })}
          </Rows>
        )}
      </Card>
    </div>
  );
}
