import { getTranslations, getLocale } from "next-intl/server";
import { getTeamWorkload } from "@/server/queries/dashboards";
import { localizeName } from "@/lib/names";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { UserAvatar } from "@/components/ui/user-avatar";

// Yuklama darajasi rangi: yengil (yashil) · oʻrta (sariq) · yuqori (qizil).
function loadColor(n: number): string {
  if (n >= 7) return "var(--danger)";
  if (n >= 4) return "var(--warning)";
  return "var(--success)";
}

/** Jamoa yuklamasi — faol topshiriqlar soni boʻyicha xodimlar (kim band, kim boʻsh). */
export async function TeamWorkloadWidget() {
  const t = await getTranslations("dashboard.workload");
  const locale = await getLocale();
  const rows = await getTeamWorkload();
  const max = Math.max(1, ...rows.map((r) => r.active));

  return (
    <Section title={t("title")}>
      {rows.length === 0 ? (
        <Card solid bare>
          <p className="py-8 text-center t-small text-[var(--ink-3)]">{t("empty")}</p>
        </Card>
      ) : (
        <Card solid bare className="px-5 sm:px-6">
          <Rows>
            {rows.map((r) => {
              const name = localizeName(r.fullName, locale);
              const sub = [r.positionTitle, r.inReview > 0 ? t("inReview", { n: r.inReview }) : null]
                .filter(Boolean)
                .join(" — ");
              return (
                <Row key={r.userId}>
                  <UserAvatar name={name} avatarUrl={r.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">{name}</p>
                    {sub && <p className="truncate t-micro text-[var(--ink-3)]">{sub}</p>}
                  </div>
                  <div className="flex w-24 shrink-0 items-center gap-2 sm:w-40">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round((r.active / max) * 100)}%`, background: loadColor(r.active) }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-sm font-bold tabular-nums text-[var(--ink)]">{r.active}</span>
                  </div>
                </Row>
              );
            })}
          </Rows>
        </Card>
      )}
    </Section>
  );
}
