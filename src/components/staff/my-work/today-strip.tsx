import { getTranslations } from "next-intl/server";
import { getTodaySummary } from "@/server/queries/my-work";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { KIND_ICON } from "./kind-meta";

/**
 * "Bugun" — boshqaruv panelining amaliy markazi. BIIB grammatikasi: bitta seksiya,
 * sarlavha chapda + sarhisob meta sifatida, ichida qattiq karta va ajratuvchi qatorlar
 * (quti emas). Butun qator — havola. Hech narsa boʻlmasa null.
 */
export async function TodayStrip({ userId, locale }: { userId: string; locale: string }) {
  const s = await getTodaySummary(userId, locale);
  if (s.today === 0 && s.overdue === 0 && s.approvals === 0) return null;
  const t = await getTranslations({ locale, namespace: "staffX.myWork" });

  const meta = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {s.today > 0 && <span className="text-[var(--info)]">{t("todayCount", { count: s.today })}</span>}
      {s.overdue > 0 && <span className="text-[var(--danger)]">{t("overdueCount", { count: s.overdue })}</span>}
      {s.approvals > 0 && <span className="text-[var(--warning)]">{t("approvalsCount", { count: s.approvals })}</span>}
    </span>
  );

  return (
    <Section title={t("todayStripTitle")} meta={meta} seeAllHref="/my-work" seeAllLabel={t("openAll")}>
      <Card bare className="px-5 sm:px-6">
        {s.top.length > 0 ? (
          <Rows>
            {s.top.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <Row key={item.key} href={item.href ?? undefined}>
                  <Icon className="size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
                  <span
                    className={
                      "min-w-0 flex-1 truncate text-[0.9375rem] font-medium " +
                      (item.bucket === "overdue" ? "text-[var(--danger)]" : "text-[var(--ink)]")
                    }
                  >
                    {item.title}
                  </span>
                </Row>
              );
            })}
          </Rows>
        ) : (
          <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("todayStripTitle")}</p>
        )}
      </Card>
    </Section>
  );
}
