import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui-biib/Card";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";
import { FactList } from "@/components/ui-biib/FactList";
import { formatDate } from "@/lib/dates";
import { getStudioCompany, getStudioPayments } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

// Studiya: oʻz loyihalari bosqichlari boʻyicha barcha toʻlovlar (faqat oʻqish).
export default async function StudioPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const company = await getStudioCompany(session.user.email);
  if (!company) notFound();

  const { items, totals } = await getStudioPayments(company.id);

  return (
    <div>
      <PageHeader title={t("studio.payments.title")} />
      <div className="flex flex-col gap-8 lg:gap-12">
      {/* Sarhisob — toʻlangan / kutilmoqda, valyuta boʻyicha (foiz chiziqsiz) */}
      {totals.length > 0 && (
        <Card>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {totals.map((tt) => (
              <FactList
                key={tt.currency}
                items={[
                  { term: `${t("studio.payments.paid")}, ${tt.currency}`, value: <span className="font-bold tabular-nums text-[var(--success)]">{money(tt.paid, tt.currency)}</span> },
                  { term: `${t("studio.payments.pending")}, ${tt.currency}`, value: <span className="font-bold tabular-nums text-[var(--warning)]">{money(tt.pending, tt.currency)}</span> },
                ]}
              />
            ))}
          </div>
        </Card>
      )}

      <Card bare className="px-5 sm:px-6">
        {items.length === 0 ? (
          <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("studio.payments.empty")}</p>
        ) : (
          <Rows>
            {items.map((p) => (
              <Row key={p.id} href={`/contractor/projects/${p.projectId}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{p.projectName}</p>
                  <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                    {p.stageOrder + 1}. {p.stageName}
                    {p.note ? `, ${p.note}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold tabular-nums text-[var(--ink)]">{money(p.amount, p.currency)}</p>
                  <p className="mt-0.5 t-micro text-[var(--ink-3)]">{formatDate(p.paidAt ?? p.createdAt, locale)}</p>
                </div>
                <Status tone={p.status === "paid" ? "success" : "warning"} className="shrink-0">
                  {p.status === "paid" ? t("studio.payments.paid") : t("studio.payments.pending")}
                </Status>
              </Row>
            ))}
          </Rows>
        )}
      </Card>
      </div>
    </div>
  );
}
