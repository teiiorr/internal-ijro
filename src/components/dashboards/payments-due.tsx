import { getTranslations } from "next-intl/server";
import { listPayables } from "@/server/queries/finance";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";

const money = (n: number, cur: string) => `${Math.round(n).toLocaleString("ru-RU")} ${cur}`;

// Kutish rangi: 14+ kun (qizil) · 7+ kun (sariq) · aks holda kulrang.
function ageColor(days: number | null): string {
  if (days == null) return "var(--ink-3)";
  if (days >= 14) return "var(--danger)";
  if (days >= 7) return "var(--warning)";
  return "var(--ink-3)";
}

/** Toʻlanadigan toʻlovlar — qabul qilingan, ammo hali toʻlanmagan bosqich toʻlovlari
 *  (eng koʻp kutganlari yuqorida). Moliya nimani toʻlashini va qancha kutilganini koʻradi. */
export async function PaymentsDueWidget() {
  const t = await getTranslations("dashboard.paymentsDue");
  const { accepted } = await listPayables();
  if (accepted.length === 0) return null;

  const sorted = [...accepted].sort((a, b) => (b.daysSinceCompleted ?? 0) - (a.daysSinceCompleted ?? 0));
  const top = sorted.slice(0, 6);

  return (
    <Section title={t("title")} seeAllHref="/projects/payments" seeAllLabel={t("all")}>
      <Card solid bare className="px-5 sm:px-6">
        <Rows>
          {top.map((r) => (
            <Row key={r.stageId} href={`/projects/${r.projectId}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{r.projectName}</p>
                <p className="truncate t-micro text-[var(--ink-3)]">{[r.studioName, r.stageName].filter(Boolean).join(" — ")}</p>
              </div>
              <div className="shrink-0 pl-3 text-right">
                <p className="text-sm font-bold tabular-nums text-[var(--ink)]">{money(r.remaining, r.currency)}</p>
                {r.daysSinceCompleted != null && r.daysSinceCompleted > 0 && (
                  <p className="t-micro tabular-nums" style={{ color: ageColor(r.daysSinceCompleted) }}>
                    {t("daysWaiting", { n: r.daysSinceCompleted })}
                  </p>
                )}
              </div>
            </Row>
          ))}
        </Rows>
      </Card>
    </Section>
  );
}
