import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Heading } from "@/components/ui-biib/Heading";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";
import { FactList } from "@/components/ui-biib/FactList";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { formatDate } from "@/lib/dates";
import { getStudioCompany, getStudioDashboard } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

// Studiya bosh sahifasi — amaliy markaz: «Sizdan kutilmoqda» (asosiy roʻyxat),
// yaqin muddatlar va toʻlovlar sarhisobi. KPI plitkalari olib tashlandi; oʻqilmagan
// chatlar faqat navigatsiya belgisi sifatida qoladi.
export default async function StudioDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const company = await getStudioCompany(session.user.email);
  if (!company) notFound();

  const d = await getStudioDashboard(company.id);

  const changesCount = d.actionStages.filter((s) => s.reviewStatus === "changes_requested").length;
  const actionMeta =
    d.actionStages.length > 0 ? (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {changesCount > 0 && <span className="text-[var(--danger)]">{t("studio.dashboard.changesRequested")}: {changesCount}</span>}
        <span className="text-[var(--warning)]">{t("studio.dashboard.inProgress")}: {d.actionStages.length - changesCount}</span>
      </span>
    ) : undefined;

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <Heading level={1} trim className="min-w-0 break-words">{company.name}</Heading>

      {/* Sizdan kutilmoqda — asosiy roʻyxat */}
      <Section title={t("studio.dashboard.needsAction")} meta={actionMeta}>
        <Card bare className="px-5 sm:px-6">
          {d.actionStages.length === 0 ? (
            <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("studio.dashboard.needsActionEmpty")}</p>
          ) : (
            <Rows>
              {d.actionStages.map((s) => {
                const changes = s.reviewStatus === "changes_requested";
                return (
                  <Row key={s.stageId} href={`/contractor/projects/${s.projectId}/stages/${s.stageId}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{s.stageName}</p>
                      <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">{s.projectName}</p>
                      {changes && s.reviewNote && <p className="mt-0.5 line-clamp-1 t-small text-[var(--danger)]">{s.reviewNote}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {changes && <Status tone="danger">{t("studio.dashboard.changesRequested")}</Status>}
                      {s.deadline && <DeadlineCountdown deadline={s.deadline} />}
                    </div>
                  </Row>
                );
              })}
            </Rows>
          )}
        </Card>
      </Section>

      {/* Yaqin muddatlar */}
      <Section title={t("studio.dashboard.upcoming")} seeAllHref="/contractor/deadlines" seeAllLabel={t("studio.dashboard.viewAll")}>
        <Card bare className="px-5 sm:px-6">
          {d.deadlines.length === 0 ? (
            <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("studio.deadlines.empty")}</p>
          ) : (
            <Rows>
              {d.deadlines.slice(0, 4).map((r) => (
                <Row key={r.stageId} href={`/contractor/projects/${r.projectId}/stages/${r.stageId}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{r.stageName}</p>
                    <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">{r.projectName}, {formatDate(r.deadline, locale)}</p>
                  </div>
                  <DeadlineCountdown deadline={r.deadline} />
                </Row>
              ))}
            </Rows>
          )}
        </Card>
      </Section>

      {/* Toʻlovlar — toʻlangan / kutilmoqda, bir qator */}
      <Section title={t("studio.dashboard.paymentsSummary")} seeAllHref="/contractor/payments" seeAllLabel={t("studio.dashboard.viewAll")}>
        <Card>
          {d.paymentTotals.length === 0 ? (
            <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("studio.payments.empty")}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {d.paymentTotals.map((tt) => (
                <FactList
                  key={tt.currency}
                  items={[
                    { term: `${t("studio.payments.paid")}, ${tt.currency}`, value: <span className="font-bold tabular-nums text-[var(--success)]">{money(tt.paid, tt.currency)}</span> },
                    { term: `${t("studio.payments.pending")}, ${tt.currency}`, value: <span className="font-bold tabular-nums text-[var(--warning)]">{money(tt.pending, tt.currency)}</span> },
                  ]}
                />
              ))}
            </div>
          )}
        </Card>
      </Section>
    </div>
  );
}
